const orm = require("mongoose");
const { connectToDb } = require("../../config/db");
const tenantSchema = require("./tenant");
const tenantRentSchema = require("./tenantRent");

const TENANT_COLLECTION_NAME = "Tenants";
const TENANT_MODEL_NAME = "Tenant";
const COLLECTION_NAME = "TenantRents";
const MODEL_NAME = "TenantRent";
const DEFAULT_UNIT_RATE = 8;

function getTenantModel() {
  return (
    orm.models[TENANT_MODEL_NAME] ||
    orm.model(TENANT_MODEL_NAME, tenantSchema, TENANT_COLLECTION_NAME)
  );
}

function getTenantRentModel() {
  return (
    orm.models[MODEL_NAME] ||
    orm.model(MODEL_NAME, tenantRentSchema, COLLECTION_NAME)
  );
}

function ensureValidId(id, message) {
  if (!orm.Types.ObjectId.isValid(id)) {
    throw new Error(message);
  }
}

async function ensureTenantExists(tenantId) {
  ensureValidId(tenantId, "Invalid tenant id");
  const Tenant = getTenantModel();
  const tenant = await Tenant.findById(tenantId).lean();

  if (!tenant) {
    throw new Error("Tenant not found");
  }

  return tenant;
}

function toNumber(value, fieldName) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`${fieldName} must be a valid number`);
  }
  return number;
}

async function getPreviousAfterUnits(tenantId, excludeRentId) {
  const TenantRent = getTenantRentModel();
  const query = { tenant: tenantId, afterUnits: { $ne: null } };

  if (excludeRentId) {
    query._id = { $ne: excludeRentId };
  }

  const previousRent = await TenantRent.findOne(query)
    .sort({ month: -1, createdAt: -1 })
    .lean();

  return previousRent?.afterUnits ?? 0;
}

async function getStartingBeforeUnits(tenantId, excludeRentId) {
  const Tenant = getTenantModel();
  const tenant = await Tenant.findById(tenantId).lean();

  if (!tenant) {
    throw new Error("Tenant not found");
  }

  if (tenant.beforeUnits != null) {
    return tenant.beforeUnits;
  }

  return getPreviousAfterUnits(tenantId, excludeRentId);
}

async function getPreviousTenantRent(tenantRent) {
  const TenantRent = getTenantRentModel();
  const tenantId = tenantRent.tenant?._id || tenantRent.tenant;
  const query = {
    tenant: tenantId,
    _id: { $ne: tenantRent._id },
  };

  if (tenantRent.month) {
    query.month = { $lt: tenantRent.month };
  }

  return TenantRent.findOne(query)
    .sort({ month: -1, createdAt: -1 })
    .lean();
}

function buildPreviousRentSummary(previousRent) {
  if (!previousRent) {
    return null;
  }

  return {
    _id: previousRent._id,
    month: previousRent.month,
    beforeUnits: previousRent.beforeUnits,
    afterUnits: previousRent.afterUnits,
    units: previousRent.units,
    totalRent: previousRent.totalRent,
  };
}

async function normalizeTenantRentData(data, existingRent) {
  const tenantId = data.tenant || existingRent?.tenant;

  if (!tenantId) {
    throw new Error("Tenant is required");
  }

  const beforeUnits =
    data.beforeUnits != null
      ? toNumber(data.beforeUnits, "Before units")
      : existingRent?.beforeUnits ??
        (await getStartingBeforeUnits(tenantId, existingRent?._id));

  const afterUnits =
    data.afterUnits != null
      ? toNumber(data.afterUnits, "After units")
      : existingRent?.afterUnits;

  if (afterUnits == null) {
    throw new Error("After units is required");
  }

  if (afterUnits < beforeUnits) {
    throw new Error("After units must be greater than or equal to before units");
  }

  const roomRent =
    data.roomRent != null
      ? toNumber(data.roomRent, "Room rent")
      : existingRent?.roomRent;

  if (roomRent == null) {
    throw new Error("Room rent is required");
  }

  const unitRate =
    data.unitRate != null
      ? toNumber(data.unitRate, "Unit rate")
      : existingRent?.unitRate ?? DEFAULT_UNIT_RATE;
  const units = afterUnits - beforeUnits;

  return {
    ...data,
    beforeUnits,
    afterUnits,
    units,
    unitRate,
    totalRent: roomRent + units * unitRate,
  };
}

async function createTenantRent(tenantRent) {
  await connectToDb();
  await ensureTenantExists(tenantRent.tenant);
  const TenantRent = getTenantRentModel();
  const normalizedTenantRent = await normalizeTenantRentData(tenantRent);
  const createdTenantRent = await TenantRent.create(normalizedTenantRent);
  const Tenant = getTenantModel();
  await Tenant.findByIdAndUpdate(createdTenantRent.tenant, {
    beforeUnits: createdTenantRent.afterUnits,
  });
  return createdTenantRent;
}

async function getTenantRents(filter = {}) {
  await connectToDb();
  const TenantRent = getTenantRentModel();
  return TenantRent.find(filter).populate("tenant").lean();
}

async function getTenantRentById(id) {
  ensureValidId(id, "Invalid tenant rent id");
  await connectToDb();
  const TenantRent = getTenantRentModel();
  const tenantRent = await TenantRent.findById(id).populate("tenant").lean();

  if (!tenantRent) {
    return null;
  }

  const previousRent = await getPreviousTenantRent(tenantRent);
  return {
    ...tenantRent,
    previousRent: buildPreviousRentSummary(previousRent),
  };
}

async function updateTenantRent(id, updates) {
  ensureValidId(id, "Invalid tenant rent id");
  await connectToDb();

  if (updates.tenant) {
    await ensureTenantExists(updates.tenant);
  }

  const TenantRent = getTenantRentModel();
  const existingRent = await TenantRent.findById(id).lean();

  if (!existingRent) {
    return null;
  }

  const normalizedUpdates = await normalizeTenantRentData(updates, existingRent);

  const updatedTenantRent = await TenantRent.findByIdAndUpdate(id, normalizedUpdates, {
    new: true,
    runValidators: true,
  })
    .populate("tenant")
    .lean();

  const Tenant = getTenantModel();
  await Tenant.findByIdAndUpdate(updatedTenantRent.tenant._id || updatedTenantRent.tenant, {
    beforeUnits: updatedTenantRent.afterUnits,
  });

  return updatedTenantRent;
}

async function markTenantRentPaid(id) {
  ensureValidId(id, "Invalid tenant rent id");
  await connectToDb();
  const Tenant = getTenantModel();
  const TenantRent = getTenantRentModel();

  const tenantRent = await TenantRent.findByIdAndUpdate(
    id,
    { status: "Paid" },
    {
      new: true,
      runValidators: true,
    }
  ).lean();

  if (!tenantRent) {
    return null;
  }

  await Tenant.findByIdAndUpdate(tenantRent.tenant, {
    lastRent: new Date(),
    lastCreditedValue: tenantRent.totalRent,
    beforeUnits: tenantRent.afterUnits,
  });

  return TenantRent.findById(id).populate("tenant").lean();
}

async function deleteTenantRent(id) {
  ensureValidId(id, "Invalid tenant rent id");
  await connectToDb();
  const TenantRent = getTenantRentModel();
  return TenantRent.findByIdAndDelete(id).populate("tenant").lean();
}

module.exports = {
  getTenantRentModel,
  createTenantRent,
  getTenantRents,
  getTenantRentById,
  updateTenantRent,
  markTenantRentPaid,
  deleteTenantRent,
};
