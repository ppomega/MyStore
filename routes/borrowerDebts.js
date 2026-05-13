const express = require("express");
const borrowerDebtCrud = require("../orm/borrowerDebtCrud");
const { creditBorrower, debitBorrower } = require("../orm/borrowerCrud");

const router = express.Router();

function getRequestData(req) {
  return req.body && req.body.data ? req.body.data : req.body;
}

router.get("/", async (req, res) => {
  try {
    const borrowerDebts = await borrowerDebtCrud.getBorrowerDebts();
    res.json(borrowerDebts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const borrowerDebt = await borrowerDebtCrud.getBorrowerDebtById(
      req.params.id
    );

    if (!borrowerDebt) {
      return res.status(404).json({ error: "Borrower debt not found" });
    }

    res.json(borrowerDebt);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST /
// Creates a debt entry and credits (increments debt) on the Borrower.
router.post("/", async (req, res) => {
  try {
    const data = getRequestData(req);
    const borrowerDebt = await borrowerDebtCrud.createBorrowerDebt(data);

    res.status(201).json(borrowerDebt);
  } catch (error) {
    const status = error.message === "Borrower not found" ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
});

// PUT /:id
// Updates a debt entry. Reverses the old value on the Borrower first,
// then applies the new value so the running debt stays accurate.
router.put("/:id", async (req, res) => {
  try {
    const data = getRequestData(req);

    // Fetch the existing debt so we know the old value before overwriting.
    const existingDebt = await borrowerDebtCrud.getBorrowerDebtById(
      req.params.id
    );

    if (!existingDebt) {
      return res.status(404).json({ error: "Borrower debt not found" });
    }

    const updatedDebt = await borrowerDebtCrud.updateBorrowerDebt(
      req.params.id,
      data
    );

    if (!updatedDebt) {
      return res.status(404).json({ error: "Borrower debt not found" });
    }
    res.json(updatedDebt);
  } catch (error) {
    const status = error.message === "Borrower not found" ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
});

// DELETE /:id
// Removes the debt entry and debits (decrements debt) from the Borrower.
router.delete("/:id", async (req, res) => {
  try {
    const borrowerDebt = await borrowerDebtCrud.deleteBorrowerDebt(
      req.params.id
    );

    if (!borrowerDebt) {
      return res.status(404).json({ error: "Borrower debt not found" });
    }

    res.json(borrowerDebt);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;