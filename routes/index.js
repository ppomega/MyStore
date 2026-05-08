const express = require("express");
const inventoryRouter = require("./inventory");
const ordersRouter = require("./orders");

const router = express.Router();

router.get("/", (req, res) => {
  res.send("Hello PP");
});

router.use("/inventory", inventoryRouter);
router.use("/orders", ordersRouter);

module.exports = router;
