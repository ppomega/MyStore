const orm = require("mongoose");
const { connectToDb } = require("../config/db");

const  tenantSchema = require("./tenant");
const  tenantPaymentSchema = require("./borrowerPayment");

const TENANT_COLLECTION_NAME = "Tenants";
const TENANT_MODEL_NAME = "Tenant";
const COLLECTION_NAME = "TenantPayments";
const MODEL_NAME = "TenantPayment";

function getTenantModel() {
  return (
    orm.models[TENANT_MODEL_NAME] ||
    orm.model(TENANT_MODEL_NAME, tenantSchema, TENANT_COLLECTION_NAME)
  );
}

function getTenantPaymentModel() {
  return (
    orm.models[MODEL_NAME] ||
    orm.model(MODEL_NAME, tenantPaymentSchema, COLLECTION_NAME)
  );
}

function ensureValidId(id, message = "Invalid tenant payment id") {
  if (!orm.Types.ObjectId.isValid(id)) {
    throw new Error(message);
  }
}

function getAmount(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Value must be a positive number");
  }

  return amount;
}

async function ensureTenantExists(tenantId) {
  ensureValidId(tenantId, "Invalid tenant id");
  const Tenant = getTenantModel();
  const tenant = await Tenant.findById(tenantId).lean();

  if (!tenant) {
    throw new Error("Tenant not found");
  }
}

async function getTenantPayments(filter = {}) {
  await connectToDb();
  const TenantPayment = getTenantPaymentModel();
  return TenantPayment.find(filter);
}

async function getTenantPaymentById(id) {
  ensureValidId(id);
  await connectToDb();
  const TenantPayment = getTenantPaymentModel();
  return TenantPayment.findById(id);
}

async function createTenantPayment(data) {
  await connectToDb();
  await ensureTenantExists(data.tenant);

  const Tenant = getTenantModel();
  const TenantPayment = getTenantPaymentModel();
  const value = getAmount(data.value);

  const payment = await TenantPayment.create({ ...data, value });

  // Payment reduces the tenant's rent
  await Tenant.findByIdAndUpdate(data.tenant, {
    $inc: { rent: -value },
    $set: { lastDebit: new Date(), lastDebitedValue: value },
  });

  return TenantPayment.findById(payment._id);
}

async function updateTenantPayment(id, updates) {
  ensureValidId(id);
  await connectToDb();

  const Tenant = getTenantModel();
  const TenantPayment = getTenantPaymentModel();
  const existingPayment = await TenantPayment.findById(id).lean();

  if (!existingPayment) {
    return null;
  }

  if (updates.tenant) {
    await ensureTenantExists(updates.tenant);
  }

  const nextUpdates = { ...updates };
  const nextValue =
    nextUpdates.value == null
      ? existingPayment.value
      : getAmount(nextUpdates.value);

  if (nextUpdates.value != null) {
    nextUpdates.value = nextValue;
  }

  const payment = await TenantPayment.findByIdAndUpdate(id, nextUpdates, {
    new: true,
    runValidators: true,
  })
    .populate("tenant")
    .lean();

 
   
    await Tenant.findByIdAndUpdate(existingPayment.tenant, {
      $inc: { rent: -nextValue }, // reduce new tenant's rent
      $set: { lastDebit: new Date(), lastDebitedValue: nextValue },
    });
  

  return payment;
}

async function deleteTenantPayment(id) {
  ensureValidId(id);
  await connectToDb();

  const Tenant = getTenantModel();
  const TenantPayment = getTenantPaymentModel();
  const payment = await TenantPayment.findByIdAndDelete(id)
    .populate("tenant")
    .lean();

  if (payment) {
    // Deleting a payment means rent goes back up
    await Tenant.findByIdAndUpdate(payment.tenant._id || payment.tenant, {
      $inc: { rent: payment.value },
      $set: { lastCredit: new Date(), lastCreditedValue: payment.value },
    });
  }

  return payment;
}

module.exports = {
  getTenantPaymentModel,
  getTenantPayments,
  getTenantPaymentById,
  createTenantPayment,
  updateTenantPayment,
  deleteTenantPayment,
};