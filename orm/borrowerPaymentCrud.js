const orm = require("mongoose");
const { connectToDb } = require("../config/db");

const borrowerPaymentSchema = require("./borrowerPayment");

const COLLECTION_NAME = "BorrowerPayments";
const MODEL_NAME = "BorrowerPayment";

function getBorrowerPaymentModel() {
  return (
    orm.models[MODEL_NAME] ||
    orm.model(MODEL_NAME, borrowerPaymentSchema, COLLECTION_NAME)
  );
}

function ensureValidId(id) {
  if (!orm.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid borrower payment id");
  }
}

async function getBorrowerPayments(filter = {}) {
  await connectToDb();
  const BorrowerPayment = getBorrowerPaymentModel();
  return BorrowerPayment.find(filter).lean();
}

async function getBorrowerPaymentById(id) {
  ensureValidId(id);
  await connectToDb();
  const BorrowerPayment = getBorrowerPaymentModel();
  return BorrowerPayment.findById(id).lean();
}

async function createBorrowerPayment(data) {
  await connectToDb();
  const BorrowerPayment = getBorrowerPaymentModel();

  const borrowerId = data.borrower;
  if (!borrowerId || !orm.Types.ObjectId.isValid(borrowerId)) {
    throw new Error("Borrower not found");
  }

  // Verify the borrower actually exists
  const Borrower =
    orm.models["Borrower"] ||
    (() => {
      throw new Error("Borrower not found");
    })();

  const borrowerExists = await Borrower.exists({ _id: borrowerId });
  if (!borrowerExists) {
    throw new Error("Borrower not found");
  }

  return BorrowerPayment.create(data);
}

async function updateBorrowerPayment(id, updates) {
  ensureValidId(id);
  await connectToDb();
  const BorrowerPayment = getBorrowerPaymentModel();

  return BorrowerPayment.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  }).lean();
}

async function deleteBorrowerPayment(id) {
  ensureValidId(id);
  await connectToDb();
  const BorrowerPayment = getBorrowerPaymentModel();
  return BorrowerPayment.findByIdAndDelete(id).lean();
}

module.exports = {
  getBorrowerPaymentModel,
  getBorrowerPayments,
  getBorrowerPaymentById,
  createBorrowerPayment,
  updateBorrowerPayment,
  deleteBorrowerPayment,
};