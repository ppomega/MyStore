const express = require("express");
const orderCrud = require("../orm/order/orderCrud");
const {
  ensureOrderSlipSaved,
  regenerateOrderSlip,
} = require("../services/orderSlipService");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const orders = await orderCrud.getOrders();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const order = await orderCrud.getOrderById(req.params.id);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const order = await orderCrud.createOrder(req.body);
    const { order: orderWithSlip } = await ensureOrderSlipSaved(String(order._id));
    res.status(201).json(orderWithSlip);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const order = await orderCrud.updateOrder(req.params.id, req.body);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const { order: orderWithSlip } = await regenerateOrderSlip(req.params.id);
    res.json(orderWithSlip || order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const order = await orderCrud.deleteOrder(req.params.id);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
