const express = require('express');
const {
  fetchSavedTenantRentSlip,
  bulkGenerateTenantRentSlips,
} = require('../services/tenantRentSlipService');
const { buildTenantRentSlipHTML } = require('../services/tenantRentSlipGenerator');

const router = express.Router();

function handleSlipError(err, res) {
  if (err.message.startsWith('Tenant rent not found')) {
    return res.status(404).json({ error: err.message });
  }
  if (err.message.startsWith('Tenant rent slip not found')) {
    return res.status(404).json({ error: err.message });
  }

  console.error('[TenantRentSlip] Error:', err);
  return res.status(500).json({ error: 'Failed to send tenant rent slip' });
}

router.get('/template', (req, res) => {
  const sampleTenantRent = {
    _id: 'template-preview',
    month: new Date(),
    roomRent: 12500,
    beforeUnits: 120,
    afterUnits: 145,
    units: 25,
    unitRate: 8,
    totalRent: 12700,
    status: 'Pending',
    previousRent: {
      _id: 'previous-template-preview',
      month: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      beforeUnits: 98,
      afterUnits: 120,
      units: 22,
      totalRent: 12676,
    },
    tenant: {
      name: 'Sample Tenant',
      phone: '9876543210',
    },
  };

  res.set({
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-cache',
  });
  res.send(buildTenantRentSlipHTML(sampleTenantRent));
});

router.get('/:id', async (req, res) => {
  try {
    const { buffer, tenantRent } = await fetchSavedTenantRentSlip(req.params.id);
    const filename = `tenant-rent-slip-${tenantRent._id}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': buffer.length,
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'no-cache',
    });
    res.send(buffer);
  } catch (err) {
    handleSlipError(err, res);
  }
});

router.get('/:id/download', async (req, res) => {
  try {
    const { buffer, tenantRent } = await fetchSavedTenantRentSlip(req.params.id);
    const filename = `tenant-rent-slip-${tenantRent._id}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': buffer.length,
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(buffer);
  } catch (err) {
    handleSlipError(err, res);
  }
});

router.post('/bulk', async (req, res) => {
  try {
    const { filter = {}, outputDir } = req.body;
    const results = await bulkGenerateTenantRentSlips(filter, outputDir);
    res.json({ success: true, count: results.length, files: results });
  } catch (err) {
    console.error('[TenantRentSlip] Bulk generation error:', err);
    res.status(500).json({ error: 'Bulk tenant rent slip generation failed' });
  }
});

module.exports = router;
