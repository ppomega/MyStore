const orm = require("mongoose");
const { connectToDb } = require("../../config/db");
const orderSchema = require("./order");

const COLLECTION_NAME = "Orders";
const MODEL_NAME = "Order";

function getOrderModel() {
  return orm.models[MODEL_NAME] || orm.model(MODEL_NAME, orderSchema, COLLECTION_NAME);
}

function ensureValidId(id) {
  if (!orm.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid order id");
  }
}


async function createOrder(order) {
  await connectToDb();
  const Order = getOrderModel();
  return Order.create(order);
}

async function getOrders(filter = {}) {
  await connectToDb();
  const Order = getOrderModel();
  return Order.find(filter).lean();
}

async function getOrderById(id) {
  ensureValidId(id);
  await connectToDb();
  const Order = getOrderModel();
  return Order.findById(id).lean();
}

async function updateOrder(id, updates) {
  ensureValidId(id);
  await connectToDb();
  const Order = getOrderModel();
  const existingOrder = await Order.findById(id).lean();

  if (!existingOrder) {
    return null;
  }

  return Order.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  }).lean();
}

async function deleteOrder(id) {
  ensureValidId(id);
  await connectToDb();
  const Order = getOrderModel();
  return Order.findByIdAndDelete(id).lean();
}

module.exports = {
  getOrderModel,
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
};
