const express = require("express");
const inventoryCrud = require("../orm/crud");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const inventory = await inventoryCrud.getInventoryItems();
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const item = await inventoryCrud.getInventoryItemById(req.params.id);

    if (!item) {
      return res.status(404).json({ error: "Inventory item not found" });
    }

    res.json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const item = await inventoryCrud.createInventoryItem(req.body);
    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const item = await inventoryCrud.updateInventoryItem(req.params.id, req.body);

    if (!item) {
      return res.status(404).json({ error: "Inventory item not found" });
    }

    res.json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const item = await inventoryCrud.deleteInventoryItem(req.params.id);

    if (!item) {
      return res.status(404).json({ error: "Inventory item not found" });
    }

    res.json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
