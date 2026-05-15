'use strict';

const puppeteer = require('puppeteer');

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(date, options = {}) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options,
  });
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function buildTenantRentSlipHTML(tenantRent) {
  const tenant = tenantRent.tenant || {};
  const month = formatDate(tenantRent.month, { day: undefined });
  const previousMonth = tenantRent.previousRent?.month
    ? formatDate(tenantRent.previousRent.month, { day: undefined })
    : '-';
  const generatedAt = new Date().toLocaleString('en-IN');
  const status = tenantRent.status || 'Pending';
  const statusColor = status === 'Paid' ? '#16a34a' : '#d97706';
  const unitRate = tenantRent.unitRate ?? 8;
  const totalRent =
    tenantRent.totalRent ?? Number(tenantRent.roomRent || 0) + Number(tenantRent.units || 0) * unitRate;
  const qtyText = `${tenantRent.units ?? 0} Unit`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: Arial, Helvetica, sans-serif;
    background: #f3eccd;
    color: #231512;
    font-size: 13px;
    padding: 28px;
  }

  .slip {
    width: 100%;
    min-height: 420px;
    background: #ffffff;
    border: 1px solid #d8c99b;
    border-top: 8px solid #231512;
    border-radius: 8px;
    padding: 28px;
    box-shadow: 0 12px 28px rgba(35, 21, 18, 0.12);
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 18px;
    border-bottom: 1px solid #d8c99b;
    padding-bottom: 18px;
    margin-bottom: 18px;
  }

  .title h1 {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 30px;
    color: #231512;
    line-height: 1.1;
  }

  .title p {
    margin-top: 5px;
    color: #6f5d3f;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.6px;
    text-transform: uppercase;
  }

  .meta {
    text-align: right;
    color: #6f5d3f;
    line-height: 1.7;
  }

  .meta strong {
    display: block;
    color: #231512;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 22px;
    line-height: 1.2;
    margin-bottom: 4px;
  }

  .tenant-box {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    background: #f3eccd;
    border: 1px solid #d8c99b;
    border-radius: 8px;
    padding: 14px 16px;
    margin-bottom: 18px;
  }

  .field label {
    display: block;
    color: #6f5d3f;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.7px;
    margin-bottom: 5px;
    text-transform: uppercase;
  }

  .field span {
    color: #231512;
    font-size: 15px;
    font-weight: 800;
  }

  .badge {
    display: inline-block;
    background: ${statusColor};
    color: #ffffff;
    border-radius: 999px;
    padding: 5px 12px;
    font-size: 11px;
    font-weight: 800;
  }

  .details {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    border: 1px solid #d8c99b;
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 22px;
  }

  .details td {
    padding: 14px 16px;
    border-bottom: 1px solid #eadfba;
  }

  .details tr:last-child td {
    border-bottom: none;
  }

  .details td:first-child {
    font-family: Arial, Helvetica, sans-serif;
    color: #6f5d3f;
    font-weight: 700;
    width: 45%;
  }

  .details td:last-child {
    text-align: right;
    color: #231512;
    font-weight: 800;
  }

  .date-pair {
    display: flex;
    justify-content: flex-end;
    gap: 18px;
    flex-wrap: wrap;
  }

  .date-pair span {
    display: inline-flex;
    gap: 6px;
    white-space: nowrap;
  }

  .date-pair strong {
    color: #6f5d3f;
    font-weight: 700;
  }

  .total-row td {
    background: #231512;
    color: #ffffff !important;
    font-size: 18px;
  }

  .footer {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-top: 1px dashed #d8c99b;
    padding-top: 14px;
    color: #6f5d3f;
    font-size: 11px;
  }

  .sig-line {
    width: 170px;
    border-top: 1px solid #231512;
    color: #231512;
    padding-top: 4px;
    text-align: center;
  }
</style>
</head>
<body>
  <div class="slip">
    <div class="header">
      <div class="title">
        <h1>Rent Slip</h1>
        <p>${escapeHtml(month)} rent receipt</p>
      </div>
      <div class="meta">
        <strong>${escapeHtml(status)}</strong>
        <div>Slip ID: ${escapeHtml(String(tenantRent._id))}</div>
        <div>Generated: ${escapeHtml(generatedAt)}</div>
      </div>
    </div>

    <div class="tenant-box">
      <div class="field">
        <label>Tenant</label>
        <span>${escapeHtml(tenant.name || 'Tenant')}</span>
      </div>
      <div class="field">
        <label>Phone</label>
        <span>${escapeHtml(tenant.phone || '-')}</span>
      </div>
      <div class="field">
        <label>Status</label>
        <span class="badge">${escapeHtml(status)}</span>
      </div>
    </div>

    <table class="details">
      <tr>
        <td>Rent Dates</td>
        <td>
          <div class="date-pair">
            <span><strong>Previous</strong> ${escapeHtml(previousMonth)}</span>
            <span><strong>Current</strong> ${escapeHtml(month)}</span>
          </div>
        </td>
      </tr>
      <tr>
        <td>Room Rent</td>
        <td>&#8377;${formatMoney(tenantRent.roomRent)}</td>
      </tr>
      <tr>
        <td>Before Units</td>
        <td>${escapeHtml(tenantRent.beforeUnits ?? 0)}</td>
      </tr>
      <tr>
        <td>After Units</td>
        <td>${escapeHtml(tenantRent.afterUnits ?? 0)}</td>
      </tr>
      <tr>
        <td>Qty</td>
        <td>${escapeHtml(qtyText)}</td>
      </tr>
      <tr>
        <td>Unit Charge</td>
        <td>&#8377;${formatMoney(Number(tenantRent.units || 0) * unitRate)}</td>
      </tr>
      <tr class="total-row">
        <td>Total Payable</td>
        <td>&#8377;${formatMoney(totalRent)}</td>
      </tr>
    </table>

    <div class="footer">
      <div>This is a computer-generated rent slip.</div>
      <div class="sig-line">Authorised Signatory</div>
    </div>
  </div>
</body>
</html>`;
}

async function htmlToPdfBuffer(html) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    return page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
  } finally {
    await browser.close();
  }
}

async function generateTenantRentSlipBuffer(tenantRent) {
  return htmlToPdfBuffer(buildTenantRentSlipHTML(tenantRent));
}

module.exports = {
  buildTenantRentSlipHTML,
  generateTenantRentSlipBuffer,
};
