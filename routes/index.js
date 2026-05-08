const express = require("express");
const inventoryRouter = require("./inventory");
const ordersRouter = require("./orders");
const borrowersRouter = require("./borrowers");
const borrowerDebtsRouter = require("./borrowerDebts");
const tenantsRouter = require("./tenants");
const tenantRentsRouter = require("./tenantRents");

const router = express.Router();

router.get("/", (req, res) => {
  res.send("Hello PP");
});

router.use("/inventory", inventoryRouter);
router.use("/orders", ordersRouter);
router.use("/borrowers", borrowersRouter);
router.use("/borrower-debts", borrowerDebtsRouter);
router.use("/tenants", tenantsRouter);
router.use("/tenant-rents", tenantRentsRouter);

module.exports = router;
