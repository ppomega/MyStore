const express = require("express");
const tenantCrud = require("../orm/tenantCrud");

const router = express.Router();

function getRequestData(req) {
  return req.body && req.body.data ? req.body.data : req.body;
}

router.get("/", async (req, res) => {
  try {
    const tenants = await tenantCrud.getTenants();
    res.json(tenants);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const tenant = await tenantCrud.getTenantById(req.params.id);

    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    res.json(tenant);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const tenant = await tenantCrud.createTenant(getRequestData(req));
    res.status(201).json(tenant);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const tenant = await tenantCrud.updateTenant(
      req.params.id,
      getRequestData(req)
    );

    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    res.json(tenant);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/:id/pay-rent", async (req, res) => {
  try {
    const tenant = await tenantCrud.markRentPaid(req.params.id);

    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    res.json(tenant);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const tenant = await tenantCrud.deleteTenant(req.params.id);

    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    res.json(tenant);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
