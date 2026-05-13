const express = require("express");
const mongoose = require("mongoose");
const tenantPaymentCrud = require("../orm/tenant/tenantPaymentCrud");
const { getTenantModel } = require("../orm/tenant/TenantCrud");

const router = express.Router();

function getRequestData(req) {
  return req.body && req.body.data ? req.body.data : req.body;
}

router.get("/", async (req, res) => {
  try {
    const payments = await tenantPaymentCrud.getTenantPayments();
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const payment = await tenantPaymentCrud.getTenantPaymentById(
      req.params.id
    );

    if (!payment) {
      return res.status(404).json({ error: "Tenant payment not found" });
    }

    res.json(payment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST /
// Records a payment and decrements the Tenant's net rent.
router.post("/", async (req, res) => {
  try {
    const data = getRequestData(req);
    const payment = await tenantPaymentCrud.createTenantPayment(data);


    res.status(201).json(payment);
  } catch (error) {
    const status = error.message === "Tenant not found" ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
});

// PUT /:id
// Updates a payment and re-syncs the Tenant's net rent.
router.put("/:id", async (req, res) => {
  try {
    const data = getRequestData(req);
    const payment = await tenantPaymentCrud.updateTenantPayment(
      req.params.id,
      data
    );

    if (!payment) {
      return res.status(404).json({ error: "Tenant payment not found" });
    }
    res.json(payment);
  } catch (error) {
    const status = error.message === "Tenant not found" ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
});

// DELETE /:id
// Removes a payment and re-syncs the Tenant's net rent.
router.delete("/:id", async (req, res) => {
  try {
    const payment = await tenantPaymentCrud.deleteTenantPayment(
      req.params.id
    );

    if (!payment) {
      return res.status(404).json({ error: "Tenant payment not found" });
    }

    res.json(payment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;