const orm = require("mongoose");
const { connectToDb } = require("../config/db");

const tenantSchema = require("./tenant");

const COLLECTION_NAME = "Tenants";
const MODEL_NAME = "Tenant";

function getTenantModel() {
  return (
    orm.models[MODEL_NAME] ||
    orm.model(MODEL_NAME, tenantSchema, COLLECTION_NAME)
  );
}

function ensureValidId(id) {
  if (!orm.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid tenant id");
  }
}

async function createTenant(tenant) {
  await connectToDb();
  const Tenant = getTenantModel();
  return Tenant.create(tenant);
}

async function getTenants(filter = {}) {
  await connectToDb();
  const Tenant = getTenantModel();
  return Tenant.find(filter).lean();
}

async function getTenantById(id) {
  ensureValidId(id);
  await connectToDb();
  const Tenant = getTenantModel();
  return Tenant.findById(id).lean();
}

async function updateTenant(id, updates) {
  ensureValidId(id);
  await connectToDb();
  const Tenant = getTenantModel();

  return Tenant.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  }).lean();
}

async function markRentPaid(id) {
  ensureValidId(id);
  await connectToDb();
  const Tenant = getTenantModel();
  const tenant = await Tenant.findById(id).lean();

  if (!tenant) {
    return null;
  }

  return Tenant.findByIdAndUpdate(
    id,
    { lastRent: new Date(), lastCreditedValue: tenant.rent || 0 },
    {
      new: true,
      runValidators: true,
    }
  ).lean();
}

async function deleteTenant(id) {
  ensureValidId(id);
  await connectToDb();
  const Tenant = getTenantModel();
  return Tenant.findByIdAndDelete(id).lean();
}

module.exports = {
  getTenantModel,
  createTenant,
  getTenants,
  getTenantById,
  updateTenant,
  markRentPaid,
  deleteTenant,
};
