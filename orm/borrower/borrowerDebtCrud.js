const orm = require("mongoose");
const { connectToDb } = require("../../config/db");
const borrowerSchema = require("./borrower");
const borrowerDebtSchema = require("./borrowerDebt");
const { recalculateBorrowerDebt } = require("./borrowerCrud");

const BORROWER_COLLECTION_NAME = "Borrowers";
const BORROWER_MODEL_NAME = "Borrower";
const COLLECTION_NAME = "BorrowerDebts";
const MODEL_NAME = "BorrowerDebt";

function getBorrowerModel() {
  return (
    orm.models[BORROWER_MODEL_NAME] ||
    orm.model(BORROWER_MODEL_NAME, borrowerSchema, BORROWER_COLLECTION_NAME)
  );
}

function getBorrowerDebtModel() {
  return (
    orm.models[MODEL_NAME] ||
    orm.model(MODEL_NAME, borrowerDebtSchema, COLLECTION_NAME)
  );
}

function ensureValidId(id, message) {
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

async function createBorrowerDebt(borrowerDebt) {
  await connectToDb();
  await ensureBorrowerExists(borrowerDebt.borrower);
  await recalculateBorrowerDebt(borrowerDebt.borrower);
  const BorrowerDebt = getBorrowerDebtModel();
  const value = getAmount(borrowerDebt.value);
  const debt = await BorrowerDebt.create({
    ...borrowerDebt,
    value,
  });

  await recalculateBorrowerDebt(borrowerDebt.borrower, {
    lastCredit: new Date(),
    lastCreditedValue: value,
  });

  return BorrowerDebt.findById(debt._id);
}

async function getBorrowerDebts(filter = {}) {
  await connectToDb();
  const BorrowerDebt = getBorrowerDebtModel();
  return BorrowerDebt.find(filter);
}

async function getBorrowerDebtById(id) {
  ensureValidId(id, "Invalid borrower debt id");
  await connectToDb();
  const BorrowerDebt = getBorrowerDebtModel();
  return BorrowerDebt.findById(id);
}

async function updateBorrowerDebt(id, updates) {
  ensureValidId(id, "Invalid borrower debt id");
  await connectToDb();
  const BorrowerDebt = getBorrowerDebtModel();
  const existingDebt = await BorrowerDebt.findById(id).lean();

  if (!existingDebt) {
    return null;
  }

  await recalculateBorrowerDebt(existingDebt.borrower);

  if (updates.borrower) {
    await ensureBorrowerExists(updates.borrower);
    await recalculateBorrowerDebt(updates.borrower);
  }

  const nextUpdates = { ...updates };
  const nextValue =
    nextUpdates.value == null ? existingDebt.value : getAmount(nextUpdates.value);

  if (nextUpdates.value != null) {
    nextUpdates.value = nextValue;
  }

  const debt = await BorrowerDebt.findByIdAndUpdate(id, nextUpdates, {
    new: true,
    runValidators: true,
  })
    .populate("borrower")
    .lean();

  await recalculateBorrowerDebt(existingDebt.borrower, {
    lastCredit: new Date(),
    lastCreditedValue: nextValue,
  });

  if (String(existingDebt.borrower) !== String(debt.borrower._id || debt.borrower)) {
    await recalculateBorrowerDebt(debt.borrower._id || debt.borrower, {
      lastCredit: new Date(),
      lastCreditedValue: nextValue,
    });
  }

  return debt;
}

async function deleteBorrowerDebt(id) {
  ensureValidId(id, "Invalid borrower debt id");
  await connectToDb();
  const BorrowerDebt = getBorrowerDebtModel();
  const existingDebt = await BorrowerDebt.findById(id).lean();

  if (!existingDebt) {
    return null;
  }

  await recalculateBorrowerDebt(existingDebt.borrower);

  const debt = await BorrowerDebt.findByIdAndDelete(id).populate("borrower").lean();

  if (debt) {
    await recalculateBorrowerDebt(debt.borrower._id || debt.borrower, {
      lastDebit: new Date(),
      lastDebitedValue: debt.value,
    });
  }

  return debt;
}

module.exports = {
  getBorrowerDebtModel,
  createBorrowerDebt,
  getBorrowerDebts,
  getBorrowerDebtById,
  updateBorrowerDebt,
  deleteBorrowerDebt,
};
