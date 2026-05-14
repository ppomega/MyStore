const fs = require('fs');
const path = require('path');
const { generateOrderSlipBuffer } = require('./orderSlipGenerator');

const { getOrderById, getOrders, getOrderModel } = require('../orm/order/orderCrud');
const { getInventoryItemById } = require('../orm/inventory/inventoryCrud');

const DEFAULT_OUTPUT_DIR = path.resolve(process.cwd(), 'order-slips');

function getSlipFileName(orderId) {
  return `order-slip-${orderId}.pdf`;
}

function getSlipFilePath(orderId, outputDir = DEFAULT_OUTPUT_DIR) {
  return path.resolve(outputDir, getSlipFileName(orderId));
}

async function ensureDirectory(dirPath) {
  await fs.promises.mkdir(dirPath, { recursive: true });
}

async function updateOrderSlipMetadata(orderId, filePath) {
  const Order = getOrderModel();
  return Order.findByIdAndUpdate(
    orderId,
    {
      orderSlip: {
        filePath,
        fileName: path.basename(filePath),
        generatedAt: new Date(),
      },
    },
    { new: true, runValidators: true }
  ).lean();
}

/**
 * Given an order (with items as ObjectId refs), resolve each item id
 * against the Inventory CRUD layer and return a fully populated order object.
 *
 * @param {Object} order - Raw order from getOrderById / getOrders
 * @returns {Promise<Object>} Order with inventory item names/categories resolved
 */
async function populateOrderItems(order) {
  if (!Array.isArray(order.items) || order.items.length === 0) {
    return order;
  }

  const populated = await Promise.all(
    order.items.map(async (item) => {
      const inventoryItem = await getInventoryItemById(String(item.itemId)).catch(() => null);
      return {
        ...item,
        name: item.name || inventoryItem?.name,
        category: inventoryItem?.category || 'General',
      };
    })
  );

  return {
    ...order,
    items: populated,
  };
}

/**
 * Regenerate and overwrite the saved slip for an order.
 * Use this after an order update.
 *
 * @param {string} orderId
 * @param {string} [outputDir]
 * @returns {Promise<{ order: Object, filePath: string }>}
 */
async function regenerateOrderSlip(orderId, outputDir = DEFAULT_OUTPUT_DIR) {
  const rawOrder = await getOrderById(orderId);
  if (!rawOrder) throw new Error(`Order not found: ${orderId}`);

  const order = await populateOrderItems(rawOrder);
  const buffer = await generateOrderSlipBuffer(order);
  const filePath = getSlipFilePath(orderId, outputDir);

  await ensureDirectory(path.dirname(filePath));
  await fs.promises.writeFile(filePath, buffer);

  const updatedOrder = await updateOrderSlipMetadata(orderId, filePath);
  return { order: updatedOrder || rawOrder, filePath };
}

/**
 * Save the order slip only if it does not already exist.
 * Use this immediately after order creation.
 *
 * @param {string} orderId
 * @param {string} [outputDir]
 * @returns {Promise<{ order: Object, filePath: string }>}
 */
async function ensureOrderSlipSaved(orderId, outputDir = DEFAULT_OUTPUT_DIR) {
  const rawOrder = await getOrderById(orderId);
  if (!rawOrder) throw new Error(`Order not found: ${orderId}`);

  const savedPath = rawOrder.orderSlip?.filePath;
  if (savedPath && fs.existsSync(savedPath)) {
    return { order: rawOrder, filePath: savedPath };
  }

  return regenerateOrderSlip(orderId, outputDir);
}

/**
 * Read the saved slip from disk without regenerating it.
 *
 * @param {string} orderId
 * @returns {Promise<{ buffer: Buffer, order: Object, filePath: string }>}
 */
async function fetchSavedSlip(orderId) {
  const rawOrder = await getOrderById(orderId);
  if (!rawOrder) throw new Error(`Order not found: ${orderId}`);

  const filePath = rawOrder.orderSlip?.filePath || getSlipFilePath(orderId);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Order slip not found: ${orderId}`);
  }

  const buffer = await fs.promises.readFile(filePath);
  return { buffer, order: rawOrder, filePath };
}

/**
 * Kept for backward compatibility. This explicitly regenerates the slip.
 *
 * @param {string} orderId
 * @returns {Promise<{ buffer: Buffer, order: Object }>}
 */
async function fetchAndGenerateSlip(orderId) {
  const { order, filePath } = await regenerateOrderSlip(orderId);
  const buffer = await fs.promises.readFile(filePath);
  return { buffer, order };
}

/**
 * Fetch multiple orders, resolve their inventory items, and save PDF slips to disk.
 *
 * @param {Object} [filter={}] - Passed directly to getOrders()
 * @param {string} [outputDir] - Directory to write PDFs into
 * @returns {Promise<Array<{ orderId: string, filePath: string }>>}
 */
async function bulkGenerateSlips(filter = {}, outputDir = DEFAULT_OUTPUT_DIR) {
  const rawOrders = await getOrders(filter);

  const results = [];
  for (const rawOrder of rawOrders) {
    const { filePath } = await regenerateOrderSlip(String(rawOrder._id), outputDir);
    results.push({ orderId: String(rawOrder._id), filePath });
  }
  return results;
}

/**
 * Fetch an order with inventory items resolved, no PDF generated.
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
  fetchSavedSlip,
  ensureOrderSlipSaved,
  regenerateOrderSlip,
  bulkGenerateSlips,
  fetchOrderWithInventory,
};
