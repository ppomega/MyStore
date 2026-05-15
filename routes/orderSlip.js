
/**
 * orderSlipRoutes.js
 * Mount this router in your Express app:
 *
 *   const orderSlipRoutes = require('./orderSlipRoutes');
 *   app.use('/api/order-slips', orderSlipRoutes);
 */

const express = require('express');
const router  = express.Router();
const { fetchSavedSlip, bulkGenerateSlips } = require('../services/orderSlipService');
const { buildOrderSlipHTML } = require('../services/orderSlipGenerator');

// ── GET /api/order-slips/:id ───────────────────────────────────────────────
// Streams PDF directly to browser / client.
router.get('/template', (req, res) => {
  const sampleOrder = {
    _id: 'template-preview',
    vendor: 'Sample Vendor',
    type: 'Purchase',
    status: 'Pending',
    createdAt: new Date(),
    estimatedTotal: 5250,
    items: [
      {
        name: 'Sample Item A',
        category: 'General',
        mode: 'Box',
        quantity: 2,
        price: 1500,
        total: 3000,
      },
      {
        name: 'Sample Item B',
        category: 'General',
        mode: 'Piece',
        quantity: 3,
        price: 750,
        total: 2250,
      },
    ],
  };

  res.set({
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-cache',
  });
  res.send(buildOrderSlipHTML(sampleOrder));
});

router.get('/:id', async (req, res) => {
  try {
    const { buffer, order } = await fetchSavedSlip(req.params.id);
    const filename = `order-slip-${order._id}.pdf`;

    res.set({
      'Content-Type':        'application/pdf',
      'Content-Length':      buffer.length,
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control':       'no-cache',
    });
    res.send(buffer);
  } catch (err) {
    if (err.message.startsWith('Order not found')) {
      return res.status(404).json({ error: err.message });
    }
    if (err.message.startsWith('Order slip not found')) {
      return res.status(404).json({ error: err.message });
    }
    console.error('[OrderSlip] Error generating slip:', err);
    res.status(500).json({ error: 'Failed to send order slip' });
  }
});

// ── GET /api/order-slips/:id/download ─────────────────────────────────────
// Forces download instead of inline preview.
router.get('/:id/download', async (req, res) => {
  try {
    const { buffer, order } = await fetchSavedSlip(req.params.id);
    const filename = `order-slip-${order._id}.pdf`;

    res.set({
      'Content-Type':        'application/pdf',
      'Content-Length':      buffer.length,
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(buffer);
  } catch (err) {
    if (err.message.startsWith('Order not found')) {
      return res.status(404).json({ error: err.message });
    }
    if (err.message.startsWith('Order slip not found')) {
      return res.status(404).json({ error: err.message });
    }
    console.error('[OrderSlip] Error generating slip:', err);
    res.status(500).json({ error: 'Failed to send order slip' });
  }
});

// ── POST /api/order-slips/bulk ─────────────────────────────────────────────
// Body: { filter: { status: "Complete" }, outputDir: "./slips" }
// Saves PDFs to disk, returns file paths.
router.post('/bulk', async (req, res) => {
  try {
    const { filter = {}, outputDir } = req.body;
    const results = await bulkGenerateSlips(filter, outputDir);
    res.json({ success: true, count: results.length, files: results });
  } catch (err) {
    console.error('[OrderSlip] Bulk generation error:', err);
    res.status(500).json({ error: 'Bulk generation failed' });
  }
});

module.exports = router;
