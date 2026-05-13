const express = require("express");
const mongoose = require("mongoose");
const borrowerPaymentCrud = require("../orm/borrower/borrowerPaymentCrud");
const { getBorrowerModel } = require("../orm/borrower/borrowerCrud");

const router = express.Router();

function getRequestData(req) {
  return req.body && req.body.data ? req.body.data : req.body;
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

    res.json(payment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;