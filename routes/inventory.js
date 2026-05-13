const express = require("express");
const inventoryCrud = require("../orm/inventory/inventoryCrud");

const router = express.Router();

function getRequestData(req) {
  return req.body && req.body.data ? req.body.data : req.body;
}

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
    const item = await inventoryCrud.createInventoryItem(getRequestData(req));
    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const item = await inventoryCrud.updateInventoryItem(
      req.params.id,
      getRequestData(req)
    );

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
