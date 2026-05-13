'use strict';

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

/**
 * Generates an HTML string for the order slip
 * @param {Object} order - Populated order document
 * @returns {string} HTML string
 */
function buildOrderSlipHTML(order) {
  const createdAt = new Date(order.createdAt).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

  const statusColor = {
    Complete: '#16a34a',
    Pending:  '#d97706',
    Cancelled:'#dc2626',
  }[order.status] || '#6b7280';

  const itemsRows = (order.items || []).map((item, i) => {
    const name     = item.name     || item.title      || item.productName || `Item ${i + 1}`;
    const qty      = item.quantity ?? item.qty         ?? 1;
    const unit     = item.unit     || item.unitName    || '';
    const price    = item.price    ?? item.unitPrice   ?? 0;
    const subtotal = item.subtotal ?? item.total       ?? price * qty;

    return `
      <tr class="${i % 2 === 0 ? 'row-even' : 'row-odd'}">
        <td class="td-num">${i + 1}</td>
        <td class="td-name">${escapeHtml(String(name))}</td>
        <td class="td-center">${escapeHtml(String(unit))}</td>
        <td class="td-right">${qty}</td>
        <td class="td-right">₹${Number(price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td class="td-right td-bold">₹${Number(subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>`;
  }).join('');

  const total = Number(order.estimatedTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 13px;
    color: #1f2937;
    background: #fff;
    padding: 32px 40px;
  }

  /* ── Header ─────────────────────────────── */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 3px solid #1e3a5f;
    padding-bottom: 16px;
    margin-bottom: 24px;
  }
  .brand h1 { font-size: 26px; color: #1e3a5f; letter-spacing: 1px; }
  .brand p  { font-size: 11px; color: #6b7280; margin-top: 2px; }
  .slip-meta { text-align: right; }
  .slip-meta h2 {
    font-size: 18px; color: #1e3a5f; text-transform: uppercase;
    letter-spacing: 2px; margin-bottom: 6px;
  }
  .slip-meta table { margin-left: auto; }
  .slip-meta td { padding: 1px 4px; font-size: 12px; }
  .slip-meta td:first-child { color: #6b7280; text-align: right; }
  .slip-meta td:last-child  { font-weight: 600; text-align: left; padding-left: 8px; }

  /* ── Info Grid ───────────────────────────── */
  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    overflow: hidden;
    margin-bottom: 24px;
  }
  .info-cell {
    padding: 10px 16px;
    border-right: 1px solid #e5e7eb;
    border-bottom: 1px solid #e5e7eb;
  }
  .info-cell:nth-child(even) { border-right: none; }
  .info-cell:nth-last-child(-n+2) { border-bottom: none; }
  .info-cell label { font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 2px; }
  .info-cell span  { font-weight: 600; font-size: 13px; }
  .badge {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 700;
    color: #fff;
    background: ${statusColor};
  }

  /* ── Items Table ─────────────────────────── */
  .section-title {
    font-size: 11px;
    font-weight: 700;
    color: #1e3a5f;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 8px;
  }
  table.items {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
  }
  table.items thead tr {
    background: #1e3a5f;
    color: #fff;
  }
  table.items thead th {
    padding: 9px 10px;
    font-size: 11px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }
  .th-num    { width: 40px;  text-align: center; }
  .th-name   { text-align: left; }
  .th-unit   { width: 80px;  text-align: center; }
  .th-qty    { width: 60px;  text-align: right; }
  .th-price  { width: 100px; text-align: right; }
  .th-sub    { width: 110px; text-align: right; }

  table.items tbody tr { transition: background 0.1s; }
  .row-even { background: #f9fafb; }
  .row-odd  { background: #fff; }
  table.items tbody td { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; }
  .td-num    { text-align: center; color: #9ca3af; font-size: 11px; }
  .td-name   { font-weight: 500; }
  .td-center { text-align: center; color: #6b7280; }
  .td-right  { text-align: right; }
  .td-bold   { font-weight: 700; }

  /* ── Totals ──────────────────────────────── */
  .totals-wrap { display: flex; justify-content: flex-end; margin-bottom: 32px; }
  .totals-box {
    width: 280px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    overflow: hidden;
  }
  .totals-box .row {
    display: flex; justify-content: space-between;
    padding: 8px 14px;
    font-size: 12px;
    border-bottom: 1px solid #f3f4f6;
  }
  .totals-box .row:last-child { border-bottom: none; }
  .totals-box .row.grand {
    background: #1e3a5f;
    color: #fff;
    font-size: 14px;
    font-weight: 700;
  }
  .totals-box .row .label { color: inherit; }
  .totals-box .row .value { font-weight: 600; }

  /* ── Footer ──────────────────────────────── */
  .footer {
    border-top: 1px dashed #d1d5db;
    padding-top: 14px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    font-size: 11px;
    color: #9ca3af;
  }
  .footer .sig-line {
    width: 180px;
    border-top: 1px solid #374151;
    text-align: center;
    padding-top: 4px;
    color: #374151;
    font-size: 11px;
  }
</style>
</head>
<body>

  <!-- Header -->
  <div class="header">
    <div class="brand">
      <h1>${escapeHtml(order.vendor || 'Vendor')}</h1>
      <p>Order Slip — Official Copy</p>
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

  <!-- Info Grid -->
  <div class="info-grid">
    <div class="info-cell">
      <label>Vendor</label>
      <span>${escapeHtml(order.vendor || '—')}</span>
    </div>
    <div class="info-cell">
      <label>Order Type</label>
      <span>${escapeHtml(order.type || '—')}</span>
    </div>
    <div class="info-cell">
      <label>Status</label>
      <span class="badge">${escapeHtml(order.status || '—')}</span>
    </div>
    <div class="info-cell">
      <label>Total Items</label>
      <span>${(order.items || []).length}</span>
    </div>
  </div>

  <!-- Items -->
  <p class="section-title">Order Items</p>
  <table class="items">
    <thead>
      <tr>
        <th class="th-num">#</th>
        <th class="th-name">Item Name</th>
        <th class="th-unit">Unit</th>
        <th class="th-qty">Qty</th>
        <th class="th-price">Unit Price</th>
        <th class="th-sub">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows || '<tr><td colspan="6" style="text-align:center;padding:20px;color:#9ca3af;">No items found</td></tr>'}
    </tbody>
  </table>

  <!-- Totals -->
  <div class="totals-wrap">
    <div class="totals-box">
      <div class="row grand">
        <span class="label">Estimated Total</span>
        <span class="value">₹${total}</span>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div>
      <div>Generated: ${new Date().toLocaleString('en-IN')}</div>
      <div style="margin-top:4px;">This is a computer-generated slip.</div>
    </div>
    <div class="sig-line">Authorised Signatory</div>
  </div>

</body>
</html>`;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}

/**
 * Convert HTML string to PDF Buffer using puppeteer
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
 * Core generator: given a populated order object, returns a PDF buffer.
 * @param {Object} order - Fully populated order document
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateOrderSlipBuffer(order) {
  const html = buildOrderSlipHTML(order);
  return htmlToPdfBuffer(html);
}

/**
 * Save order slip PDF to disk.
 * @param {Object} order - Fully populated order document
 * @param {string} outputDir - Directory to save PDF (default: ./order-slips)
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
