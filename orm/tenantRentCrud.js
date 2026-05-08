const orm = require("mongoose");
const { connectToDb } = require("../config/db");
const tenantSchema = require("./tenant");
const tenantRentSchema = require("./tenantRent");

const TENANT_COLLECTION_NAME = "Tenants";
const TENANT_MODEL_NAME = "Tenant";
const COLLECTION_NAME = "TenantRents";
const MODEL_NAME = "TenantRent";

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
}

async function createTenantRent(tenantRent) {
  await connectToDb();
  await ensureTenantExists(tenantRent.tenant);
  const TenantRent = getTenantRentModel();
  return TenantRent.create(tenantRent);
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
  return TenantRent.findById(id).populate("tenant").lean();
}

async function updateTenantRent(id, updates) {
  ensureValidId(id, "Invalid tenant rent id");
  await connectToDb();

  if (updates.tenant) {
    await ensureTenantExists(updates.tenant);
  }

  const TenantRent = getTenantRentModel();
  return TenantRent.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  })
    .populate("tenant")
    .lean();
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
