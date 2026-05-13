const express = require("express");
const tenantRentCrud = require("../orm/tenant/tenantRentCrud");

const router = express.Router();

function getRequestData(req) {
  return req.body && req.body.data ? req.body.data : req.body;
}

router.get("/", async (req, res) => {
  try {
    const tenantRents = await tenantRentCrud.getTenantRents();
    res.json(tenantRents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const tenantRent = await tenantRentCrud.getTenantRentById(req.params.id);

    if (!tenantRent) {
      return res.status(404).json({ error: "Tenant rent not found" });
    }

    res.json(tenantRent);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const tenantRent = await tenantRentCrud.createTenantRent(getRequestData(req));
    res.status(201).json(tenantRent);
  } catch (error) {
    const status = error.message === "Tenant not found" ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const tenantRent = await tenantRentCrud.updateTenantRent(
      req.params.id,
      getRequestData(req)
    );

    if (!tenantRent) {
      return res.status(404).json({ error: "Tenant rent not found" });
    }

    res.json(tenantRent);
  } catch (error) {
    const status = error.message === "Tenant not found" ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
});

router.post("/:id/mark-paid", async (req, res) => {
  try {
    const tenantRent = await tenantRentCrud.markTenantRentPaid(req.params.id);

    if (!tenantRent) {
      return res.status(404).json({ error: "Tenant rent not found" });
    }

    res.json(tenantRent);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const tenantRent = await tenantRentCrud.deleteTenantRent(req.params.id);

    if (!tenantRent) {
      return res.status(404).json({ error: "Tenant rent not found" });
    }

    res.json(tenantRent);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
