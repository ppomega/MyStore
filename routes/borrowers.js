const express = require("express");
const borrowerCrud = require("../orm/borrower/borrowerCrud");

const router = express.Router();

function getRequestData(req) {
  return req.body && req.body.data ? req.body.data : req.body;
}

function getRequestAmount(req) {
  const data = getRequestData(req);
  return data.amount;
}

router.get("/", async (req, res) => {
  try {
    const borrowers = await borrowerCrud.getBorrowers();
    res.json(borrowers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const borrower = await borrowerCrud.getBorrowerById(req.params.id);

    if (!borrower) {
      return res.status(404).json({ error: "Borrower not found" });
    }

    res.json(borrower);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const borrower = await borrowerCrud.createBorrower(getRequestData(req));
    res.status(201).json(borrower);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const borrower = await borrowerCrud.updateBorrower(
      req.params.id,
      getRequestData(req)
    );

    if (!borrower) {
      return res.status(404).json({ error: "Borrower not found" });
    }

    res.json(borrower);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/:id/credit", async (req, res) => {
  try {
    const borrower = await borrowerCrud.creditBorrower(
      req.params.id,
      getRequestAmount(req)
    );

    if (!borrower) {
      return res.status(404).json({ error: "Borrower not found" });
    }

    res.json(borrower);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/:id/debit", async (req, res) => {
  try {
    const borrower = await borrowerCrud.debitBorrower(
      req.params.id,
      getRequestAmount(req)
    );

    if (!borrower) {
      return res.status(404).json({ error: "Borrower not found" });
    }

    res.json(borrower);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const borrower = await borrowerCrud.deleteBorrower(req.params.id);

    if (!borrower) {
      return res.status(404).json({ error: "Borrower not found" });
    }

    res.json(borrower);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
