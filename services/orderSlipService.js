const orm = require('mongoose');
const { generateOrderSlipBuffer, saveOrderSlip } = require('./orderSlipGenerator');



// Lazy getters — resolved at call-time, not at require-time.
// Change 'Order' / 'Inventory' to match your actual model names.
const orderSchema = require("../orm/order/order");

const COLLECTION_NAME = "Orders";
const MODEL_NAME = "Order";

function getOrderModel() {
  return orm.models[MODEL_NAME] || orm.model(MODEL_NAME, orderSchema, COLLECTION_NAME);
}const Inventory = () => getModel('Inventory');

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Fetch a single order with populated items and return a PDF buffer.
 *
 * @param {string} orderId
 * @param {Object} [opts]
 * @param {string} [opts.itemsField='items']    - Field on Order that holds item refs
 * @param {string} [opts.itemModel='Inventory'] - Model name the refs point to
 * @returns {Promise<{ buffer: Buffer, order: Object }>}
 */
async function fetchAndGenerateSlip(orderId, opts = {}) {
  const { itemsField = 'items', itemModel = 'Inventory' } = opts;

  const order = await Order()
    .findById(orderId)
    .populate({ path: itemsField, model: itemModel })
    .lean();

  if (!order) throw new Error(`Order not found: ${orderId}`);

  const buffer = await generateOrderSlipBuffer(order);
  return { buffer, order };
}

/**
 * Fetch multiple orders with populated items and generate PDF slips saved to disk.
 *
 * @param {Object} [filter={}]                  - Mongoose query filter e.g. { status: 'Complete' }
 * @param {string} [outputDir='./order-slips']  - Directory to save PDFs
 * @param {Object} [opts]
 * @param {string} [opts.itemsField='items']
 * @param {string} [opts.itemModel='Inventory']
 * @returns {Promise<Array<{ orderId: string, filePath: string }>>}
 */
async function bulkGenerateSlips(filter = {}, outputDir = './order-slips', opts = {}) {
  const { itemsField = 'items', itemModel = 'Inventory' } = opts;

  const orders = await Order()
    .find(filter)
    .populate({ path: itemsField, model: itemModel })
    .lean();

  const results = [];
  for (const order of orders) {
    const filePath = await saveOrderSlip(order, outputDir);
    results.push({ orderId: String(order._id), filePath });
  }
  return results;
}

/**
 * Fetch a single inventory/item document by ID.
 *
 * @param {string} itemId
 * @returns {Promise<Object>}
 */
async function fetchInventoryItem(itemId) {
  const item = await Inventory().findById(itemId).lean();
  if (!item) throw new Error(`Inventory item not found: ${itemId}`);
  return item;
}

/**
 * Fetch an order with its inventory items populated — no PDF generated.
 * Useful for building a preview or running checks before slip generation.
 *
 * @param {string} orderId
 * @param {Object} [opts]
 * @param {string} [opts.itemsField='items']
 * @param {string} [opts.itemModel='Inventory']
 * @returns {Promise<Object>}
 */
async function fetchOrderWithInventory(orderId, opts = {}) {
  const { itemsField = 'items', itemModel = 'Inventory' } = opts;

  const order = await Order()
    .findById(orderId)
    .populate({ path: itemsField, model: itemModel })
    .lean();

  if (!order) throw new Error(`Order not found: ${orderId}`);
  return order;
}

module.exports = {
  fetchAndGenerateSlip,
  bulkGenerateSlips,
  fetchInventoryItem,
  fetchOrderWithInventory,
};