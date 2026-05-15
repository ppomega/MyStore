const orm = require("mongoose");
const { connectToDb } = require("../../config/db");

const borrowerSchema = require("./borrower");
const borrowerDebtSchema = require("./borrowerDebt");
const borrowerPaymentSchema = require("./borrowerPayment");

const COLLECTION_NAME = "Borrowers";
const MODEL_NAME = "Borrower";
const BORROWER_DEBT_COLLECTION_NAME = "BorrowerDebts";
const BORROWER_DEBT_MODEL_NAME = "BorrowerDebt";
const BORROWER_PAYMENT_COLLECTION_NAME = "BorrowerPayments";
const BORROWER_PAYMENT_MODEL_NAME = "BorrowerPayment";

function getBorrowerModel() {
  return (
    orm.models[MODEL_NAME] ||
    orm.model(MODEL_NAME, borrowerSchema, COLLECTION_NAME)
  );
}

function getBorrowerDebtModel() {
  return (
    orm.models[BORROWER_DEBT_MODEL_NAME] ||
    orm.model(
      BORROWER_DEBT_MODEL_NAME,
      borrowerDebtSchema,
      BORROWER_DEBT_COLLECTION_NAME
    )
  );
}

function getBorrowerPaymentModel() {
  return (
    orm.models[BORROWER_PAYMENT_MODEL_NAME] ||
    orm.model(
      BORROWER_PAYMENT_MODEL_NAME,
      borrowerPaymentSchema,
      BORROWER_PAYMENT_COLLECTION_NAME
    )
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

function getNonNegativeAmount(value, message = "Amount must be a positive number") {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(message);
  }

  return amount;
}

function toObjectId(id) {
  return new orm.Types.ObjectId(String(id));
}

async function getBorrowerEntryTotals(id) {
  const borrowerId = toObjectId(id);
  const BorrowerDebt = getBorrowerDebtModel();
  const BorrowerPayment = getBorrowerPaymentModel();

  const [debtTotal] = await BorrowerDebt.aggregate([
    { $match: { borrower: borrowerId } },
    { $group: { _id: null, total: { $sum: "$value" } } },
  ]);
  const [paymentTotal] = await BorrowerPayment.aggregate([
    { $match: { borrower: borrowerId } },
    { $group: { _id: null, total: { $sum: "$value" } } },
  ]);

  return {
    debts: debtTotal ? debtTotal.total : 0,
    payments: paymentTotal ? paymentTotal.total : 0,
  };
}

async function ensureInitialDebt(id) {
  const Borrower = getBorrowerModel();
  const borrower = await Borrower.findById(id).lean();

  if (!borrower) {
    return null;
  }

  if (borrower.initialDebt != null) {
    return borrower;
  }

  const totals = await getBorrowerEntryTotals(id);
  const initialDebt = Math.max(
    0,
    Number(borrower.debt || 0) - totals.debts + totals.payments
  );

  return Borrower.findByIdAndUpdate(
    id,
    { initialDebt },
    { new: true, runValidators: true }
  ).lean();
}

async function recalculateBorrowerDebt(id, activity = {}) {
  ensureValidId(id);
  await connectToDb();

  const Borrower = getBorrowerModel();
  const borrower = await ensureInitialDebt(id);

  if (!borrower) {
    return null;
  }

  const totals = await getBorrowerEntryTotals(id);
  const debt = Number(borrower.initialDebt || 0) + totals.debts - totals.payments;

  if (debt < 0) {
    throw new Error("Payment amount cannot be greater than current debt");
  }

  return Borrower.findByIdAndUpdate(
    id,
    {
      debt,
      ...activity,
    },
    { new: true, runValidators: true }
  ).lean();
}

async function createBorrower(borrower) {
  await connectToDb();
  const Borrower = getBorrowerModel();
  const initialDebt = getNonNegativeAmount(
    borrower.initialDebt ?? borrower.debt ?? 0,
    "Initial debt must be a non-negative number"
  );

  return Borrower.create({
    ...borrower,
    initialDebt,
    debt: initialDebt,
  });
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
  const nextUpdates = { ...updates };

  if (nextUpdates.debt != null || nextUpdates.initialDebt != null) {
    nextUpdates.initialDebt = getNonNegativeAmount(
      nextUpdates.initialDebt ?? nextUpdates.debt,
      "Initial debt must be a non-negative number"
    );
    delete nextUpdates.debt;
  }

  const borrower = await Borrower.findByIdAndUpdate(id, nextUpdates, {
    new: true,
    runValidators: true,
  }).lean();

  if (!borrower) {
    return null;
  }

  return recalculateBorrowerDebt(id);
}

async function creditBorrower(id, amount) {
  ensureValidId(id);
  await connectToDb();
  const creditAmount = getAmount(amount);
  const borrower = await ensureInitialDebt(id);

  if (!borrower) {
    return null;
  }

  const Borrower = getBorrowerModel();
  await Borrower.findByIdAndUpdate(
    id,
    {
      $inc: { initialDebt: creditAmount },
      $set: { lastCredit: new Date(), lastCreditedValue: creditAmount },
    },
    {
      new: true,
      runValidators: true,
    }
  ).lean();

  return recalculateBorrowerDebt(id, {
    lastCredit: new Date(),
    lastCreditedValue: creditAmount,
  });
}

async function debitBorrower(id, amount) {
  ensureValidId(id);
  await connectToDb();
  const borrower = await recalculateBorrowerDebt(id);

  if (!borrower) {
    return null;
  }

  const debitAmount = getAmount(amount);
  const nextDebt = borrower.debt - debitAmount;

  if (nextDebt < 0) {
    throw new Error("Debit amount cannot be greater than current debt");
  }

  const BorrowerPayment = getBorrowerPaymentModel();
  await BorrowerPayment.create({
    borrower: id,
    paymentDate: new Date(),
    value: debitAmount,
  });

  return recalculateBorrowerDebt(id, {
    lastDebit: new Date(),
    lastDebitedValue: debitAmount,
  });
}

async function deleteBorrower(id) {
  ensureValidId(id);
  await connectToDb();
  const Borrower = getBorrowerModel();
  const BorrowerDebt = getBorrowerDebtModel();
  const BorrowerPayment = getBorrowerPaymentModel();
  const borrower = await Borrower.findByIdAndDelete(id).lean();

  if (borrower) {
    await Promise.all([
      BorrowerDebt.deleteMany({ borrower: id }),
      BorrowerPayment.deleteMany({ borrower: id }),
    ]);
  }

  return borrower;
}

module.exports = {
  getBorrowerModel,
  getBorrowerDebtModel,
  getBorrowerPaymentModel,
  createBorrower,
  getBorrowers,
  getBorrowerById,
  updateBorrower,
  creditBorrower,
  debitBorrower,
  recalculateBorrowerDebt,
  deleteBorrower,
};
