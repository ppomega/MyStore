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

function normalizeOrderTotals(order) {
  if (!Array.isArray(order.items)) {
    return order;
  }

  const items = order.items.map((item) => {
    const nextItem = { ...item };
    nextItem.total = nextItem.quantity * nextItem.price;

    return nextItem;
  });

  return {
    ...order,
    items,
    estimatedTotal: items.reduce((sum, item) => sum + item.total, 0),
  };
}

async function createOrder(order) {
  await connectToDb();
  const Order = getOrderModel();
  return Order.create(normalizeOrderTotals(order));
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

  const normalizedUpdates = normalizeOrderTotals({
    ...existingOrder,
    ...updates,
    items: updates.items || existingOrder.items,
    type: updates.type || existingOrder.type,
  });
  delete normalizedUpdates._id;
  delete normalizedUpdates.__v;

  return Order.findByIdAndUpdate(id, normalizedUpdates, {
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
