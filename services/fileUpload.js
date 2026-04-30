const path = require("node:path");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs/promises");
const CloudflareR2 = require("cloudflare-r2-s3");
require("dotenv").config();

const DEFAULT_LARGE_UPLOAD_THRESHOLD_BYTES = 100 * 1024 * 1024;

let r2Client;

function getEnv(name, fallbackName) {
  return process.env[name] || process.env[fallbackName];
}

function getRequiredEnv(name, fallbackName) {
  const value = getEnv(name, fallbackName);

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getR2Config() {
  const accountId = getRequiredEnv(
    "CLOUDFLARE_R2_ACCOUNT_ID",
    "CLOUDFLARE_ACCOUNT_ID"
  );
  const host =
    getEnv("CLOUDFLARE_R2_HOST", "CLOUDFLARE_HOST") ||
    `${accountId}.r2.cloudflarestorage.com`;

  return {
    accessKeyId: getRequiredEnv(
      "CLOUDFLARE_R2_ACCESS_KEY_ID",
      "CLOUDFLARE_ACCESS_KEY"
    ),
    secretAccessKey: getRequiredEnv(
      "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
      "CLOUDFLARE_SECRET_ACCESS_KEY"
    ),
    bucket: getRequiredEnv("CLOUDFLARE_R2_BUCKET", "CLOUDFLARE_BUCKET"),
    accountId,
    host,
    publicUrl: getEnv("CLOUDFLARE_R2_PUBLIC_URL", "CLOUDFLARE_PUBLIC_URL"),
  };
}

function getR2Client() {
  if (!r2Client) {
    r2Client = new CloudflareR2(getR2Config());
  }

  return r2Client;
}

function sanitizeFileName(fileName) {
  const parsedPath = path.parse(fileName);
  const safeName = parsedPath.name.replace(/[^a-zA-Z0-9-_]/g, "_");
  const safeExt = parsedPath.ext.replace(/[^a-zA-Z0-9.]/g, "");

  return `${safeName || "file"}${safeExt}`;
}

function buildObjectKey(filePath, options = {}) {
  if (options.key) {
    return options.key.replace(/^\/+/, "");
  }

  const folder = (options.folder || "uploads").replace(/^\/+|\/+$/g, "");
  const originalName = options.originalName || path.basename(filePath);
  const fileName = sanitizeFileName(originalName);

  return path.posix.join(folder, `${Date.now()}-${randomUUID()}-${fileName}`);
}

function buildPublicUrl(key) {
  const { publicUrl } = getR2Config();

  if (!publicUrl) {
    return null;
  }

  return `${publicUrl.replace(/\/+$/, "")}/${encodeURI(key)}`;
}

async function uploadFile(filePath, options = {}) {
  const file = await fs.stat(filePath);

  if (!file.isFile()) {
    throw new Error("Upload path must point to a file");
  }

  const key = buildObjectKey(filePath, options);
  const threshold = Number(
    process.env.CLOUDFLARE_R2_LARGE_UPLOAD_THRESHOLD_BYTES ||
      DEFAULT_LARGE_UPLOAD_THRESHOLD_BYTES
  );
  const shouldUseLargeUpload =
    options.largeUpload === true || file.size >= threshold;
  const client = getR2Client();
  const uploadType = shouldUseLargeUpload ? "large" : "small";
  const response = shouldUseLargeUpload
    ? await client.UploadData.largeUpload(filePath, key)
    : await client.UploadData.smallUpload(filePath, key);

  return {
    key,
    bucket: getR2Config().bucket,
    size: file.size,
    uploadType,
    url: buildPublicUrl(key),
    response,
  };
}

module.exports = {
  uploadFile,
  getR2Client,
  getR2Config,
  buildObjectKey,
};
