const orm = require("mongoose");
const { connectToDb } = require("../../config/db");

const borrowerSchema = require("./borrower");

const COLLECTION_NAME = "Borrowers";
const MODEL_NAME = "Borrower";

function getBorrowerModel() {
  return (
    orm.models[MODEL_NAME] ||
    orm.model(MODEL_NAME, borrowerSchema, COLLECTION_NAME)
  );
}

function ensureValidId(id) {
  if (!orm.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid borrower id");
  }
}

function getAmount(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be a positive number");
  }

  return amount;
}

async function createBorrower(borrower) {
  await connectToDb();
  const Borrower = getBorrowerModel();
  return Borrower.create(borrower);
}

async function getBorrowers(filter = {}) {
  await connectToDb();
  const Borrower = getBorrowerModel();
  return Borrower.find(filter).lean();
}

async function getBorrowerById(id) {
  ensureValidId(id);
  await connectToDb();
  const Borrower = getBorrowerModel();
  return Borrower.findById(id).lean();
}

async function updateBorrower(id, updates) {
  ensureValidId(id);
  await connectToDb();
  const Borrower = getBorrowerModel();

  return Borrower.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  }).lean();
}

async function creditBorrower(id, amount) {
  ensureValidId(id);
  await connectToDb();
  const Borrower = getBorrowerModel();
  const creditAmount = getAmount(amount);

  return Borrower.findByIdAndUpdate(
    id,
    {
      $inc: { debt: creditAmount },
      $set: { lastCredit: new Date(), lastCreditedValue: creditAmount },
    },
    {
      new: true,
      runValidators: true,
    }
  ).lean();
}

async function debitBorrower(id, amount) {
  ensureValidId(id);
  await connectToDb();
  const Borrower = getBorrowerModel();
  const borrower = await Borrower.findById(id).lean();

  if (!borrower) {
    return null;
  }

  const debitAmount = getAmount(amount);
  const nextDebt = borrower.debt - debitAmount;

  if (nextDebt < 0) {
    throw new Error("Debit amount cannot be greater than current debt");
  }

  return Borrower.findByIdAndUpdate(
    id,
    {
      debt: nextDebt,
      lastDebit: new Date(),
      lastDebitedValue: debitAmount,
    },
    {
      new: true,
      runValidators: true,
    }
  ).lean();
}

async function deleteBorrower(id) {
  ensureValidId(id);
  await connectToDb();
  const Borrower = getBorrowerModel();
  return Borrower.findByIdAndDelete(id).lean();
}

module.exports = {
  getBorrowerModel,
  createBorrower,
  getBorrowers,
  getBorrowerById,
  updateBorrower,
  creditBorrower,
  debitBorrower,
  deleteBorrower,
};
