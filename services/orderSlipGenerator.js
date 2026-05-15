'use strict';

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

/**
 * Escape HTML special characters
 */
function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Builds the HTML string for an order slip.
 * Item shape expected:
 *   { itemId, name, category, mode, quantity, price, total }
 *
 * @param {Object} order - Populated order document
 * @returns {string} HTML string
 */
function buildOrderSlipHTML(order) {
  const createdAt = new Date(order.createdAt).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const statusColor = {
    Complete: '#16a34a',
    Pending: '#d97706',
    Cancelled: '#dc2626',
  }[order.status] || '#64748b';

  const items = order.items || [];

  const grouped = {};
  items.forEach((item) => {
    const category = item.category || 'General';
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(item);
  });

  let rowIndex = 0;
  const itemsRows = Object.entries(grouped).map(([category, categoryItems]) => {
    const categoryHeader = `
      <tr class="category-row">
        <td colspan="5" class="td-category-header">${escapeHtml(category)}</td>
      </tr>`;

    const rows = categoryItems.map((item) => {
      const name = item.name || `Item ${rowIndex + 1}`;
      const mode = item.mode || '';
      const qty = item.quantity ?? item.qty ?? 1;
      const price = item.price ?? 0;
      const subtotal = item.total ?? item.subtotal ?? price * qty;
      const bg = rowIndex % 2 === 0 ? 'row-even' : 'row-odd';
      rowIndex++;

      const qtyText = `${qty}${mode ? ` ${mode}` : ''}`;

      return `
        <tr class="${bg}">
          <td class="td-num">${rowIndex}</td>
          <td class="td-name">${escapeHtml(name)}</td>
          <td class="td-right">${escapeHtml(qtyText)}</td>
          <td class="td-right">&#8377;${Number(price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td class="td-right td-bold">&#8377;${Number(subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>`;
    }).join('');

    return categoryHeader + rows;
  }).join('');

  const grandTotal = Number(order.estimatedTotal || 0)
    .toLocaleString('en-IN', { minimumFractionDigits: 2 });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 12px;
    color: #231512;
    background: #f3eccd;
    padding: 24px;
  }

  .slip {
    background: #ffffff;
    border: 1px solid #d8c99b;
    border-top: 8px solid #231512;
    border-radius: 8px;
    padding: 28px 30px;
    box-shadow: 0 12px 30px rgba(35, 21, 18, 0.12);
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 24px;
    border-bottom: 1px solid #d8c99b;
    padding-bottom: 18px;
    margin-bottom: 18px;
  }

  .brand h1 {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 30px;
    line-height: 1.05;
    color: #231512;
  }

  .brand p {
    color: #6f5d3f;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.6px;
    margin-top: 5px;
    text-transform: uppercase;
  }

  .slip-meta {
    text-align: right;
  }

  .slip-meta h2 {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 22px;
    color: #231512;
    margin-bottom: 7px;
  }

  .slip-meta table { margin-left: auto; }
  .slip-meta td { padding: 2px 4px; font-size: 11px; }
  .slip-meta td:first-child { color: #6f5d3f; text-align: right; }
  .slip-meta td:last-child { font-weight: 600; text-align: left; padding-left: 8px; }

  .summary {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    background: #f3eccd;
    border: 1px solid #d8c99b;
    border-radius: 8px;
    padding: 12px 14px;
    margin-bottom: 18px;
  }

  .summary-item { min-width: 0; }

  .summary-item label {
    display: block;
    color: #6f5d3f;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.7px;
    margin-bottom: 4px;
    text-transform: uppercase;
  }

  .summary-item span {
    color: #231512;
    font-size: 13px;
    font-weight: 800;
  }

  .badge {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 999px;
    color: #ffffff;
    background: ${statusColor};
    font-size: 10px;
    font-weight: 700;
  }

  .section-title {
    font-family: Arial, Helvetica, sans-serif;
    color: #231512;
    font-size: 16px;
    font-weight: 800;
    margin-bottom: 8px;
  }

  table.items {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    border: 1px solid #d8c99b;
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 16px;
  }

  table.items thead tr {
    background: #231512;
    color: #ffffff;
  }

  table.items thead th {
    font-family: Arial, Helvetica, sans-serif;
    padding: 10px;
    font-size: 10px;
    letter-spacing: 0.6px;
    text-transform: uppercase;
  }

  .th-num { width: 36px; text-align: center; }
  .th-name { text-align: left; }
  .th-qty { width: 110px; text-align: right; }
  .th-price { width: 100px; text-align: right; }
  .th-sub { width: 110px; text-align: right; }

  .category-row td.td-category-header {
    font-family: Arial, Helvetica, sans-serif;
    background: #f3eccd;
    color: #231512;
    border-bottom: 1px solid #d8c99b;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.8px;
    padding: 6px 10px;
    text-transform: uppercase;
  }

  .row-even { background: #fffaf0; }
  .row-odd { background: #ffffff; }

  table.items tbody td {
    padding: 9px 10px;
    border-bottom: 1px solid #eadfba;
    vertical-align: middle;
  }

  table.items tbody tr:last-child td { border-bottom: none; }

  .td-num { color: #94a3b8; font-size: 11px; text-align: center; }
  .td-name { font-weight: 700; }
  .td-center { text-align: center; }
  .td-right { text-align: right; }
  .td-bold { color: #231512; font-weight: 800; }
  .td-muted { color: #cbd5e1; }

  .mode-badge {
    display: inline-block;
    padding: 3px 8px;
    background: #f3eccd;
    border: 1px solid #d8c99b;
    border-radius: 999px;
    color: #231512;
    font-size: 10px;
    font-weight: 700;
  }

  .totals-wrap {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 26px;
  }

  .totals-box {
    width: 260px;
    border-radius: 8px;
    overflow: hidden;
  }

  .totals-box .row {
    display: flex;
    justify-content: space-between;
    padding: 12px 16px;
  }

  .totals-box .row.grand {
    background: #231512;
    color: #ffffff;
    font-size: 16px;
    font-weight: 800;
  }

  .totals-box .row .value { font-weight: 800; }

  .footer {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-top: 1px dashed #d8c99b;
    padding-top: 14px;
    color: #6f5d3f;
    font-size: 11px;
  }

  .footer .sig-line {
    width: 180px;
    border-top: 1px solid #231512;
    color: #231512;
    font-size: 11px;
    padding-top: 4px;
    text-align: center;
  }
</style>
</head>
<body>
  <div class="slip">
    <div class="header">
      <div class="brand">
        <h1>${escapeHtml(order.vendor || 'Vendor')}</h1>
        <p>Order Slip - Official Copy</p>
      </div>
      <div class="slip-meta">
        <h2>Order Slip</h2>
        <table>
          <tr><td>Order ID</td><td>${escapeHtml(String(order._id))}</td></tr>
          <tr><td>Date</td><td>${createdAt}</td></tr>
          <tr><td>Type</td><td>${escapeHtml(order.type || '')}</td></tr>
        </table>
      </div>
    </div>

    <div class="summary">
      <div class="summary-item">
        <label>Vendor</label>
        <span>${escapeHtml(order.vendor || '-')}</span>
      </div>
      <div class="summary-item">
        <label>Status</label>
        <span class="badge">${escapeHtml(order.status || '-')}</span>
      </div>
      <div class="summary-item">
        <label>Items</label>
        <span>${items.length}</span>
      </div>
      <div class="summary-item">
        <label>Order Type</label>
        <span>${escapeHtml(order.type || '-')}</span>
      </div>
    </div>

    <p class="section-title">Order Items</p>
    <table class="items">
      <thead>
        <tr>
          <th class="th-num">#</th>
          <th class="th-name">Item Name</th>
          <th class="th-qty">Qty</th>
          <th class="th-price">Unit Price</th>
          <th class="th-sub">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows || '<tr><td colspan="5" style="text-align:center;padding:20px;color:#6f5d3f;">No items found</td></tr>'}
      </tbody>
    </table>

    <div class="totals-wrap">
      <div class="totals-box">
        <div class="row grand">
          <span class="label">Estimated Total</span>
          <span class="value">&#8377;${grandTotal}</span>
        </div>
      </div>
    </div>

    <div class="footer">
      <div>
        <div>Generated: ${new Date().toLocaleString('en-IN')}</div>
        <div style="margin-top:4px;">This is a computer-generated slip.</div>
      </div>
      <div class="sig-line">Authorised Signatory</div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Convert HTML string to PDF Buffer using Puppeteer.
 * @param {string} html
 * @returns {Promise<Buffer>}
 */
async function htmlToPdfBuffer(html) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

/**
 * Given a fully populated order object, returns a PDF buffer.
 * @param {Object} order
 * @returns {Promise<Buffer>}
 */
async function generateOrderSlipBuffer(order) {
  const html = buildOrderSlipHTML(order);
  return htmlToPdfBuffer(html);
}

/**
 * Save order slip PDF to disk.
 * @param {Object} order
 * @param {string} [outputDir='./order-slips']
 * @returns {Promise<string>} Absolute path to saved PDF
 */
async function saveOrderSlip(order, outputDir = './order-slips') {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const fileName = `order-slip-${order._id}-${Date.now()}.pdf`;
  const filePath = path.resolve(outputDir, fileName);
  const buffer = await generateOrderSlipBuffer(order);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

module.exports = { generateOrderSlipBuffer, saveOrderSlip, buildOrderSlipHTML };
