const cloudinary = require('cloudinary').v2;

/**
 * Cloudinary configuration.
 *
 * Accepts either:
 *   1. A single `CLOUDINARY_URL` env var (the Cloudinary SDK auto-detects it
 *      when no explicit `cloudinary.config()` call is made).
 *   2. The classic three: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
 *      `CLOUDINARY_API_SECRET`.
 *
 * If neither is provided, `enabled` is `false` and the rest of the app falls
 * back to local disk storage (great for offline dev, useless in production
 * because Render's filesystem is ephemeral).
 */
const hasUrl = !!process.env.CLOUDINARY_URL;
const hasParts = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);
const enabled = hasUrl || hasParts;

if (enabled && !hasUrl) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

if (enabled) {
  console.log('☁️  Cloudinary uploads ENABLED');
} else {
  console.log('🗂️  Cloudinary not configured — using local disk uploads');
}

module.exports = { cloudinary, enabled };
