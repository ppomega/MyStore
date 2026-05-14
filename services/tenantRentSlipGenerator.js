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
  const generatedAt = new Date().toLocaleString('en-IN');
  const status = tenantRent.status || 'Pending';
  const statusColor = status === 'Paid' ? '#16a34a' : '#d97706';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: Arial, Helvetica, sans-serif;
    background: #f8fafc;
    color: #172033;
    font-size: 13px;
    padding: 28px;
  }

  .slip {
    width: 100%;
    min-height: 420px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-top: 8px solid #2563eb;
    border-radius: 8px;
    padding: 28px;
    box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 18px;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 18px;
    margin-bottom: 18px;
  }

  .title h1 {
    font-family: 'Trebuchet MS', Arial, sans-serif;
    font-size: 30px;
    color: #0f172a;
    line-height: 1.1;
  }

  .title p {
    margin-top: 5px;
    color: #64748b;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.6px;
    text-transform: uppercase;
  }

  .meta {
    text-align: right;
    color: #64748b;
    line-height: 1.7;
  }

  .meta strong {
    display: block;
    color: #2563eb;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 22px;
    line-height: 1.2;
    margin-bottom: 4px;
  }

  .tenant-box {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    background: #eff6ff;
    border: 1px solid #dbeafe;
    border-radius: 8px;
    padding: 14px 16px;
    margin-bottom: 18px;
  }

  .field label {
    display: block;
    color: #64748b;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.7px;
    margin-bottom: 5px;
    text-transform: uppercase;
  }

  .field span {
    color: #0f172a;
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
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 22px;
  }

  .details td {
    padding: 14px 16px;
    border-bottom: 1px solid #edf2f7;
  }

  .details tr:last-child td {
    border-bottom: none;
  }

  .details td:first-child {
    color: #64748b;
    font-weight: 700;
    width: 45%;
  }

  .details td:last-child {
    text-align: right;
    color: #0f172a;
    font-weight: 800;
  }

  .total-row td {
    background: #2563eb;
    color: #ffffff !important;
    font-size: 18px;
  }

  .footer {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-top: 1px dashed #cbd5e1;
    padding-top: 14px;
    color: #94a3b8;
    font-size: 11px;
  }

  .sig-line {
    width: 170px;
    border-top: 1px solid #334155;
    color: #334155;
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
        <td>Rent Month</td>
        <td>${escapeHtml(month)}</td>
      </tr>
      <tr>
        <td>Room Rent</td>
        <td>&#8377;${formatMoney(tenantRent.roomRent)}</td>
      </tr>
      <tr>
        <td>Units</td>
        <td>${escapeHtml(tenantRent.units)}</td>
      </tr>
      <tr class="total-row">
        <td>Total Payable</td>
        <td>&#8377;${formatMoney(tenantRent.roomRent)}</td>
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
