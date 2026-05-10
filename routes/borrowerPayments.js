const express = require("express");
const mongoose = require("mongoose");
const borrowerPaymentCrud = require("../orm/borrowerPaymentCrud");
const { getBorrowerModel } = require("../orm/borrowerCrud");

const router = express.Router();

function getRequestData(req) {
  return req.body && req.body.data ? req.body.data : req.body;
}

// Recomputes the Borrower.debt by summing all BorrowerDebt values
// then subtracting all BorrowerPayment values for that borrower.
// This keeps the debt field accurate as a net figure.
async function syncBorrowerDebt(borrowerId) {
  const BorrowerDebt = mongoose.models["BorrowerDebt"];
  const BorrowerPayment = mongoose.models["BorrowerPayment"];

  const objectId = new mongoose.Types.ObjectId(borrowerId);

  const [debtResult] = await BorrowerDebt.aggregate([
    { $match: { borrower: objectId } },
    { $group: { _id: null, total: { $sum: "$value" } } },
  ]);

  const [paymentResult] = await BorrowerPayment.aggregate([
    { $match: { borrower: objectId } },
    { $group: { _id: null, total: { $sum: "$value" } } },
  ]);

  const totalDebt = debtResult?.total ?? 0;
  const totalPaid = paymentResult?.total ?? 0;
  const netDebt = Math.max(0, totalDebt - totalPaid);

  const Borrower = getBorrowerModel();
  await Borrower.findByIdAndUpdate(borrowerId, { debt: netDebt });
}

router.get("/", async (req, res) => {
  try {
    const payments = await borrowerPaymentCrud.getBorrowerPayments();
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const payment = await borrowerPaymentCrud.getBorrowerPaymentById(
      req.params.id
    );

    if (!payment) {
      return res.status(404).json({ error: "Borrower payment not found" });
    }

    res.json(payment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST /
// Records a payment and decrements the Borrower's net debt.
router.post("/", async (req, res) => {
  try {
    const data = getRequestData(req);
    const payment = await borrowerPaymentCrud.createBorrowerPayment(data);

    await syncBorrowerDebt(payment.borrower.toString());

    res.status(201).json(payment);
  } catch (error) {
    const status = error.message === "Borrower not found" ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
});

// PUT /:id
// Updates a payment and re-syncs the Borrower's net debt.
router.put("/:id", async (req, res) => {
  try {
    const data = getRequestData(req);
    const payment = await borrowerPaymentCrud.updateBorrowerPayment(
      req.params.id,
      data
    );

    if (!payment) {
      return res.status(404).json({ error: "Borrower payment not found" });
    }

    await syncBorrowerDebt(payment.borrower.toString());

    res.json(payment);
  } catch (error) {
    const status = error.message === "Borrower not found" ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
});

// DELETE /:id
// Removes a payment and re-syncs the Borrower's net debt.
router.delete("/:id", async (req, res) => {
  try {
    const payment = await borrowerPaymentCrud.deleteBorrowerPayment(
      req.params.id
    );

    if (!payment) {
      return res.status(404).json({ error: "Borrower payment not found" });
    }

    await syncBorrowerDebt(payment.borrower.toString());

    res.json(payment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;