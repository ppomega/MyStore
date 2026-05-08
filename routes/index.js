const express = require("express");
const inventoryRouter = require("./inventory");
const ordersRouter = require("./orders");
const borrowersRouter = require("./borrowers");

const router = express.Router();

router.get("/", (req, res) => {
  res.send("Hello PP");
});

router.use("/inventory", inventoryRouter);
router.use("/orders", ordersRouter);
router.use("/borrowers", borrowersRouter);

module.exports = router;
