const orm = require("mongoose");
const { connectToDb } = require("../config/db");

const borrowerSchema = require("./borrower");
const borrowerPaymentSchema = require("./borrowerPayment");

const BORROWER_COLLECTION_NAME = "Borrowers";
const BORROWER_MODEL_NAME = "Borrower";
const COLLECTION_NAME = "BorrowerPayments";
const MODEL_NAME = "BorrowerPayment";

function getBorrowerModel() {
  return (
    orm.models[BORROWER_MODEL_NAME] ||
    orm.model(BORROWER_MODEL_NAME, borrowerSchema, BORROWER_COLLECTION_NAME)
  );
}

function getBorrowerPaymentModel() {
  return (
    orm.models[MODEL_NAME] ||
    orm.model(MODEL_NAME, borrowerPaymentSchema, COLLECTION_NAME)
  );
}

function ensureValidId(id, message = "Invalid borrower payment id") {
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

async function ensureBorrowerExists(borrowerId) {
  ensureValidId(borrowerId, "Invalid borrower id");
  const Borrower = getBorrowerModel();
  const borrower = await Borrower.findById(borrowerId).lean();

  if (!borrower) {
    throw new Error("Borrower not found");
  }
}

async function getBorrowerPayments(filter = {}) {
  await connectToDb();
  const BorrowerPayment = getBorrowerPaymentModel();
  return BorrowerPayment.find(filter);
}

async function getBorrowerPaymentById(id) {
  ensureValidId(id);
  await connectToDb();
  const BorrowerPayment = getBorrowerPaymentModel();
  return BorrowerPayment.findById(id);
}

async function createBorrowerPayment(data) {
  await connectToDb();
  await ensureBorrowerExists(data.borrower);

  const Borrower = getBorrowerModel();
  const BorrowerPayment = getBorrowerPaymentModel();
  const value = getAmount(data.value);

  const payment = await BorrowerPayment.create({ ...data, value });

  // Payment reduces the borrower's debt
  await Borrower.findByIdAndUpdate(data.borrower, {
    $inc: { debt: -value },
    $set: { lastDebit: new Date(), lastDebitedValue: value },
  });

  return BorrowerPayment.findById(payment._id);
}

async function updateBorrowerPayment(id, updates) {
  ensureValidId(id);
  await connectToDb();

  const Borrower = getBorrowerModel();
  const BorrowerPayment = getBorrowerPaymentModel();
  const existingPayment = await BorrowerPayment.findById(id).lean();

  if (!existingPayment) {
    return null;
  }

  if (updates.borrower) {
    await ensureBorrowerExists(updates.borrower);
  }

  const nextUpdates = { ...updates };
  const nextValue =
    nextUpdates.value == null
      ? existingPayment.value
      : getAmount(nextUpdates.value);

  if (nextUpdates.value != null) {
    nextUpdates.value = nextValue;
  }

  const payment = await BorrowerPayment.findByIdAndUpdate(id, nextUpdates, {
    new: true,
    runValidators: true,
  })
    .populate("borrower")
    .lean();

 
   
    await Borrower.findByIdAndUpdate(existingPayment.borrower, {
      $inc: { debt: -nextValue }, // reduce new borrower's debt
      $set: { lastDebit: new Date(), lastDebitedValue: nextValue },
    });
  

  return payment;
}

async function deleteBorrowerPayment(id) {
  ensureValidId(id);
  await connectToDb();

  const Borrower = getBorrowerModel();
  const BorrowerPayment = getBorrowerPaymentModel();
  const payment = await BorrowerPayment.findByIdAndDelete(id)
    .populate("borrower")
    .lean();

  if (payment) {
    // Deleting a payment means debt goes back up
    await Borrower.findByIdAndUpdate(payment.borrower._id || payment.borrower, {
      $inc: { debt: payment.value },
      $set: { lastCredit: new Date(), lastCreditedValue: payment.value },
    });
  }

  return payment;
}

module.exports = {
  getBorrowerPaymentModel,
  getBorrowerPayments,
  getBorrowerPaymentById,
  createBorrowerPayment,
  updateBorrowerPayment,
  deleteBorrowerPayment,
};