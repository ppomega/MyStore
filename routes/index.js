const express = require("express");
const inventoryRouter = require("./inventory");

const router = express.Router();

router.get("/", (req, res) => {
  res.send("Hello PP");
});

router.use("/inventory", inventoryRouter);

module.exports = router;
