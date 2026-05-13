const orm = require("mongoose");
const { connectToDb } = require("../config/db");
const borrowerSchema = require("./borrower");
const borrowerDebtSchema = require("./borrowerDebt");

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
  const Borrower = getBorrowerModel();
  const BorrowerDebt = getBorrowerDebtModel();
  const value = getAmount(borrowerDebt.value);
  const debt = await BorrowerDebt.create({
    ...borrowerDebt,
    value,
  });
  await Borrower.findByIdAndUpdate(borrowerDebt.borrower, {
    $inc: { debt: value },
    $set: { lastCredit: new Date(), lastCreditedValue: value },
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
  const Borrower = getBorrowerModel();
  const BorrowerDebt = getBorrowerDebtModel();
  const existingDebt = await BorrowerDebt.findById(id).lean();

  if (!existingDebt) {
    return null;
  }

  if (updates.borrower) {
    await ensureBorrowerExists(updates.borrower);
  }

  const nextUpdates = { ...updates };
  const nextBorrower = nextUpdates.borrower || existingDebt.borrower;
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

  if (String(existingDebt.borrower) === String(nextBorrower)) {
    const debtDelta = nextValue - existingDebt.value;
    const borrowerUpdate = { $inc: { debt: debtDelta } };

    if (debtDelta > 0) {
      borrowerUpdate.$set = {
        lastCredit: new Date(),
        lastCreditedValue: debtDelta,
      };
    } else if (debtDelta < 0) {
      borrowerUpdate.$set = {
        lastDebit: new Date(),
        lastDebitedValue: Math.abs(debtDelta),
      };
    }

    await Borrower.findByIdAndUpdate(nextBorrower, borrowerUpdate);
  } else {
    await Borrower.findByIdAndUpdate(existingDebt.borrower, {
      $inc: { debt: -existingDebt.value },
      $set: {
        lastDebit: new Date(),
        lastDebitedValue: existingDebt.value,
      },
    });
    await Borrower.findByIdAndUpdate(nextBorrower, {
      $inc: { debt: nextValue },
      $set: { lastCredit: new Date(), lastCreditedValue: nextValue },
    });
  }

  return debt;
}

async function deleteBorrowerDebt(id) {
  ensureValidId(id, "Invalid borrower debt id");
  await connectToDb();
  const Borrower = getBorrowerModel();
  const BorrowerDebt = getBorrowerDebtModel();
  const debt = await BorrowerDebt.findByIdAndDelete(id).populate("borrower").lean();

  if (debt) {
    await Borrower.findByIdAndUpdate(debt.borrower._id || debt.borrower, {
      $inc: { debt: -debt.value },
      $set: { lastDebit: new Date(), lastDebitedValue: debt.value },
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
