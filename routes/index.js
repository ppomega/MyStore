const express = require("express");
const inventoryRouter = require("./inventory");
const ordersRouter = require("./orders");
const borrowersRouter = require("./borrowers");
const tenantsRouter = require("./tenants");
const tenantRentsRouter = require("./tenantRents");

const router = express.Router();

router.get("/", (req, res) => {
  res.send("Hello PP");
});

router.use("/inventory", inventoryRouter);
router.use("/orders", ordersRouter);
router.use("/borrowers", borrowersRouter);
router.use("/tenants", tenantsRouter);
router.use("/tenant-rents", tenantRentsRouter);

module.exports = router;
