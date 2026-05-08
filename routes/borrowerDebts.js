const express = require("express");
const borrowerDebtCrud = require("../orm/borrowerDebtCrud");

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

router.post("/", async (req, res) => {
  try {
    const borrowerDebt = await borrowerDebtCrud.createBorrowerDebt(
      getRequestData(req)
    );
    res.status(201).json(borrowerDebt);
  } catch (error) {
    const status = error.message === "Borrower not found" ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const borrowerDebt = await borrowerDebtCrud.updateBorrowerDebt(
      req.params.id,
      getRequestData(req)
    );

    if (!borrowerDebt) {
      return res.status(404).json({ error: "Borrower debt not found" });
    }

    res.json(borrowerDebt);
  } catch (error) {
    const status = error.message === "Borrower not found" ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
});

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
