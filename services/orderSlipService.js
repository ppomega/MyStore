const { generateOrderSlipBuffer, saveOrderSlip } = require('./orderSlipGenerator');

// ─── Import your existing CRUD modules ───────────────────────────────────────
// Adjust these paths to match your project structure.
const { getOrderById, getOrders, getOrderModel }         = require('../orm/order/orderCrud');
const { getInventoryItemById, getInventoryModel }         = require('../orm/inventory/inventoryCrud');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Given an order (with items as ObjectId refs), resolve each item id
 * against the Inventory CRUD layer and return a fully populated order object.
 *
 * @param {Object} order - Raw order from getOrderById / getOrders
 * @returns {Promise<Object>} Order with items array replaced by full documents
 */
async function populateOrderItems(order) {
  if (!Array.isArray(order.items) || order.items.length === 0) {
    return order;
  }
  const populated = await Promise.all(
    order.items.map(async (item) => {
      const c = await getInventoryItemById(String(item.itemId)).catch(() => null);
      console.log("Resolved item:", c);
      return {...item, name: c.name, category: c.category}; // skip missing refs
    })
  );

  console.log(populated);
  return {
    ...order,
    items: populated.filter(Boolean), // drop any nulls from missing/deleted items
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Fetch a single order, resolve its inventory items, and return a PDF buffer.
 *
 * @param {string} orderId
 * @returns {Promise<{ buffer: Buffer, order: Object }>}
 */
async function fetchAndGenerateSlip(orderId) {
  const rawOrder = await getOrderById(orderId);
  if (!rawOrder) throw new Error(`Order not found: ${orderId}`);

  const order  = await populateOrderItems(rawOrder);
  const buffer = await generateOrderSlipBuffer(order);
  return { buffer, order };
}

/**
 * Fetch multiple orders, resolve their inventory items, and save PDF slips to disk.
 *
 * @param {Object} [filter={}]                 - Passed directly to getOrders()
 * @param {string} [outputDir='./order-slips'] - Directory to write PDFs into
 * @returns {Promise<Array<{ orderId: string, filePath: string }>>}
 */
async function bulkGenerateSlips(filter = {}, outputDir = './order-slips') {
  const rawOrders = await getOrders(filter);

  const results = [];
  for (const rawOrder of rawOrders) {
    const order    = await populateOrderItems(rawOrder);
    const filePath = await saveOrderSlip(order, outputDir);
    results.push({ orderId: String(order._id), filePath });
  }
  return results;
}

/**
 * Fetch an order with inventory items resolved — no PDF generated.
 * Useful for previewing slip data before committing to PDF generation.
 *
 * @param {string} orderId
 * @returns {Promise<Object>}
 */
async function fetchOrderWithInventory(orderId) {
  const rawOrder = await getOrderById(orderId);
  if (!rawOrder) throw new Error(`Order not found: ${orderId}`);
  return populateOrderItems(rawOrder);
}

module.exports = {
  fetchAndGenerateSlip,
  bulkGenerateSlips,
  fetchOrderWithInventory,
};