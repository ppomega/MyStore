const fs = require('fs');
const path = require('path');
const { generateTenantRentSlipBuffer } = require('./tenantRentSlipGenerator');
const {
  getTenantRentById,
  getTenantRents,
  getTenantRentModel,
} = require('../orm/tenant/tenantRentCrud');

const DEFAULT_OUTPUT_DIR = path.resolve(process.cwd(), 'tenant-rent-slips');

function getSlipFileName(tenantRentId) {
  return `tenant-rent-slip-${tenantRentId}.pdf`;
}

function getSlipFilePath(tenantRentId, outputDir = DEFAULT_OUTPUT_DIR) {
  return path.resolve(outputDir, getSlipFileName(tenantRentId));
}

async function ensureDirectory(dirPath) {
  await fs.promises.mkdir(dirPath, { recursive: true });
}

async function updateRentSlipMetadata(tenantRentId, filePath) {
  const TenantRent = getTenantRentModel();
  return TenantRent.findByIdAndUpdate(
    tenantRentId,
    {
      rentSlip: {
        filePath,
        fileName: path.basename(filePath),
        generatedAt: new Date(),
      },
    },
    { new: true, runValidators: true }
  )
    .populate('tenant')
    .lean();
}

async function regenerateTenantRentSlip(tenantRentId, outputDir = DEFAULT_OUTPUT_DIR) {
  const tenantRent = await getTenantRentById(tenantRentId);
  if (!tenantRent) throw new Error(`Tenant rent not found: ${tenantRentId}`);

  const buffer = await generateTenantRentSlipBuffer(tenantRent);
  const filePath = getSlipFilePath(tenantRentId, outputDir);

  await ensureDirectory(path.dirname(filePath));
  await fs.promises.writeFile(filePath, buffer);

  const updatedTenantRent = await updateRentSlipMetadata(tenantRentId, filePath);
  return { tenantRent: updatedTenantRent || tenantRent, filePath };
}

async function ensureTenantRentSlipSaved(tenantRentId, outputDir = DEFAULT_OUTPUT_DIR) {
  const tenantRent = await getTenantRentById(tenantRentId);
  if (!tenantRent) throw new Error(`Tenant rent not found: ${tenantRentId}`);

  const savedPath = tenantRent.rentSlip?.filePath;
  if (savedPath && fs.existsSync(savedPath)) {
    return { tenantRent, filePath: savedPath };
  }

  return regenerateTenantRentSlip(tenantRentId, outputDir);
}

async function fetchSavedTenantRentSlip(tenantRentId) {
  const tenantRent = await getTenantRentById(tenantRentId);
  if (!tenantRent) throw new Error(`Tenant rent not found: ${tenantRentId}`);

  const filePath = tenantRent.rentSlip?.filePath || getSlipFilePath(tenantRentId);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Tenant rent slip not found: ${tenantRentId}`);
  }

  const buffer = await fs.promises.readFile(filePath);
  return { buffer, tenantRent, filePath };
}

async function bulkGenerateTenantRentSlips(filter = {}, outputDir = DEFAULT_OUTPUT_DIR) {
  const tenantRents = await getTenantRents(filter);

  const results = [];
  for (const tenantRent of tenantRents) {
    const { filePath } = await regenerateTenantRentSlip(String(tenantRent._id), outputDir);
    results.push({ tenantRentId: String(tenantRent._id), filePath });
  }

  return results;
}

module.exports = {
  ensureTenantRentSlipSaved,
  fetchSavedTenantRentSlip,
  regenerateTenantRentSlip,
  bulkGenerateTenantRentSlips,
};
