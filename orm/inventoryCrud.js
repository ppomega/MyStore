const orm = require("mongoose");
const { connectToDb } = require("../config/db");

const inventorySchema = require("./inventory");

const COLLECTION_NAME = "Inventory";
const MODEL_NAME = "Inventory";

function getInventoryModel() {
  return (
    orm.models[MODEL_NAME] ||
    orm.model(MODEL_NAME, inventorySchema, COLLECTION_NAME)
  );
}

function ensureValidId(id) {
  if (!orm.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid inventory item id");
  }
}

async function createInventoryItem(item) {
  await connectToDb();
  const Inventory = getInventoryModel();
  return Inventory.create(item);
}

async function getInventoryItems(filter = {}) {
  await connectToDb();
  const Inventory = getInventoryModel();
  return Inventory.find(filter).lean();
}

async function getInventoryItemById(id) {
  ensureValidId(id);
  await connectToDb();
  const Inventory = getInventoryModel();
  return Inventory.findById(id).lean();
}

async function updateInventoryItem(id, updates) {
  ensureValidId(id);
  await connectToDb();
  const Inventory = getInventoryModel();

  return Inventory.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  }).lean();
}

async function deleteInventoryItem(id) {
  ensureValidId(id);
  await connectToDb();
  const Inventory = getInventoryModel();
  return Inventory.findByIdAndDelete(id).lean();
}

module.exports = {
  getInventoryModel,
  createInventoryItem,
  getInventoryItems,
  getInventoryItemById,
  updateInventoryItem,
  deleteInventoryItem,
};
