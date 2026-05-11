#!/usr/bin/env node
/**
 * migrate-uploads-to-cloudinary.js
 *
 * One-off migration that walks every Listing.photos[] and User.avatarUrl in
 * MongoDB, finds entries that still point at the old local `/uploads/...`
 * disk storage, and re-uploads the file to Cloudinary so it survives Render's
 * ephemeral filesystem.
 *
 * Behaviour:
 *   • Idempotent — anything already on Cloudinary (https://res.cloudinary.com/…)
 *     is skipped, so it's safe to run repeatedly.
 *   • Resilient   — per-photo errors are logged but never abort the run.
 *   • Honest      — by default it's a dry-run that touches NOTHING in the DB
 *     and on Cloudinary. Pass `--commit` (or `--apply`) to actually upload
 *     and write back.
 *
 * Usage (from `server/`):
 *
 *   node src/scripts/migrate-uploads-to-cloudinary.js            # dry run
 *   node src/scripts/migrate-uploads-to-cloudinary.js --commit   # do it
 *   npm run migrate:uploads -- --commit                          # via npm
 *
 * Required env (loaded from server/.env):
 *   MONGO_URI                        – the same DB your prod points at
 *   CLOUDINARY_URL                   – OR the three CLOUDINARY_* fields
 *
 * Files are looked up under `server/uploads/`. Anything missing on disk is
 * left untouched in the DB (so you can see what's orphaned and decide what
 * to do with it manually).
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

const { cloudinary, enabled: cloudinaryEnabled } = require('../config/cloudinary');
const Listing = require('../models/Listing');
const User = require('../models/User');

// ──────────────────────────────────────────────────────────────────────────
// Flags
// ──────────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const COMMIT = args.includes('--commit') || args.includes('--apply');
const VERBOSE = args.includes('-v') || args.includes('--verbose');

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads');

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────
const isCloudinaryUrl = (u) => /^https?:\/\//i.test(u || '') && /cloudinary\./i.test(u || '');
const isHttpUrl       = (u) => /^https?:\/\//i.test(u || '');
const isLocalUpload   = (u) => typeof u === 'string' && u.startsWith('/uploads/');

const localPathFor = (u) => {
  // u looks like '/uploads/listings/<file>' or '/uploads/avatars/<file>'.
  // Strip the leading '/uploads/' so we can join under UPLOAD_ROOT.
  const rel = u.replace(/^\/?uploads\/?/, '');
  return path.join(UPLOAD_ROOT, rel);
};

const cloudinaryFolderFor = (u) => {
  if (u.startsWith('/uploads/listings/')) return 'uniswap/listings';
  if (u.startsWith('/uploads/avatars/'))  return 'uniswap/avatars';
  return 'uniswap/migrated';
};

const uploadFile = (absPath, folder) =>
  new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      absPath,
      {
        folder,
        resource_type: 'image',
        transformation: [
          { quality: 'auto:good', fetch_format: 'auto' },
          { width: 1600, height: 1600, crop: 'limit' },
        ],
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result.secure_url);
      }
    );
  });

// Resolve a single local '/uploads/...' URL → Cloudinary secure URL.
// Returns one of:
//   { kind: 'migrated', oldUrl, newUrl }
//   { kind: 'missing',  oldUrl, absPath }
//   { kind: 'skipped',  oldUrl, reason }
//   { kind: 'failed',   oldUrl, error }
async function migrateOne(url) {
  if (!url) return { kind: 'skipped', oldUrl: url, reason: 'empty' };
  if (isCloudinaryUrl(url)) return { kind: 'skipped', oldUrl: url, reason: 'already-cloudinary' };
  if (isHttpUrl(url))       return { kind: 'skipped', oldUrl: url, reason: 'external-url' };
  if (!isLocalUpload(url))  return { kind: 'skipped', oldUrl: url, reason: 'unknown-format' };

  const absPath = localPathFor(url);
  if (!fs.existsSync(absPath)) return { kind: 'missing', oldUrl: url, absPath };

  if (!COMMIT) {
    // Dry-run: pretend we did it.
    return { kind: 'migrated', oldUrl: url, newUrl: '(dry-run: would upload)' };
  }

  try {
    const newUrl = await uploadFile(absPath, cloudinaryFolderFor(url));
    return { kind: 'migrated', oldUrl: url, newUrl };
  } catch (error) {
    return { kind: 'failed', oldUrl: url, error };
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('─'.repeat(70));
  console.log(`  UniSwap uploads → Cloudinary migration`);
  console.log(`  Mode: ${COMMIT ? 'COMMIT (writes will be applied)' : 'DRY-RUN (no writes)'}`);
  console.log('─'.repeat(70));

  if (!process.env.MONGO_URI) {
    console.error('✗ MONGO_URI is not set. Did you create server/.env?');
    process.exit(1);
  }
  if (!cloudinaryEnabled) {
    console.error('✗ Cloudinary is not configured. Set CLOUDINARY_URL (or the three');
    console.error('  CLOUDINARY_CLOUD_NAME/_API_KEY/_API_SECRET vars) in server/.env');
    console.error('  before running this migration.');
    process.exit(1);
  }
  if (!fs.existsSync(UPLOAD_ROOT)) {
    console.error(`✗ Local uploads folder not found at ${UPLOAD_ROOT}`);
    console.error('  This script must be run on the machine that still has the');
    console.error('  original /uploads/ folder on disk.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log(`✓ Connected to MongoDB`);

  const counters = {
    listingsScanned: 0,
    listingsTouched: 0,
    avatarsScanned: 0,
    avatarsTouched: 0,
    photos: { migrated: 0, missing: 0, failed: 0, skipped: 0 },
    avatars: { migrated: 0, missing: 0, failed: 0, skipped: 0 },
  };

  // ── Listings ──────────────────────────────────────────────────────────
  console.log('\n┌─ Listings ────────────────────────────────────────────────────┐');
  const listings = await Listing.find({}).select('_id title photos');
  console.log(`│  Found ${listings.length} listings`);

  for (const listing of listings) {
    counters.listingsScanned++;
    if (!Array.isArray(listing.photos) || listing.photos.length === 0) continue;

    const next = [];
    let changed = false;

    for (const photo of listing.photos) {
      const r = await migrateOne(photo);
      counters.photos[r.kind] = (counters.photos[r.kind] || 0) + 1;

      if (r.kind === 'migrated') {
        next.push(COMMIT ? r.newUrl : r.oldUrl);
        if (COMMIT) changed = true;
        if (VERBOSE || !COMMIT) {
          console.log(`│  ${listing._id} ${r.oldUrl}`);
          console.log(`│      → ${COMMIT ? r.newUrl : '(would migrate)'}`);
        }
      } else if (r.kind === 'missing') {
        next.push(photo); // keep the (broken) URL so you can audit later
        console.log(`│  ⚠  ${listing._id} missing on disk: ${r.oldUrl}`);
      } else if (r.kind === 'failed') {
        next.push(photo);
        console.error(`│  ✗ ${listing._id} upload failed for ${r.oldUrl}: ${r.error.message}`);
      } else {
        next.push(photo); // skipped — keep as-is
        if (VERBOSE) console.log(`│  · ${listing._id} skip (${r.reason}): ${r.oldUrl}`);
      }
    }

    if (changed) {
      listing.photos = next;
      await listing.save();
      counters.listingsTouched++;
    }
  }
  console.log('└───────────────────────────────────────────────────────────────┘');

  // ── Avatars ───────────────────────────────────────────────────────────
  console.log('\n┌─ User avatars ────────────────────────────────────────────────┐');
  const users = await User.find({ avatarUrl: { $ne: null } }).select('_id email avatarUrl');
  console.log(`│  Found ${users.length} users with avatars`);

  for (const user of users) {
    counters.avatarsScanned++;
    const r = await migrateOne(user.avatarUrl);
    counters.avatars[r.kind] = (counters.avatars[r.kind] || 0) + 1;

    if (r.kind === 'migrated') {
      if (VERBOSE || !COMMIT) {
        console.log(`│  ${user.email} ${r.oldUrl}`);
        console.log(`│      → ${COMMIT ? r.newUrl : '(would migrate)'}`);
      }
      if (COMMIT) {
        user.avatarUrl = r.newUrl;
        await user.save();
        counters.avatarsTouched++;
      }
    } else if (r.kind === 'missing') {
      console.log(`│  ⚠  ${user.email} avatar missing on disk: ${r.oldUrl}`);
    } else if (r.kind === 'failed') {
      console.error(`│  ✗ ${user.email} upload failed: ${r.error.message}`);
    } else if (VERBOSE) {
      console.log(`│  · ${user.email} skip (${r.reason}): ${r.oldUrl}`);
    }
  }
  console.log('└───────────────────────────────────────────────────────────────┘');

  // ── Summary ───────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(70));
  console.log('  SUMMARY');
  console.log('─'.repeat(70));
  console.log(`  Listings scanned:        ${counters.listingsScanned}`);
  console.log(`  Listings touched:        ${counters.listingsTouched}`);
  console.log(`  Photos migrated:         ${counters.photos.migrated || 0}`);
  console.log(`  Photos already cloud/ext:${counters.photos.skipped || 0}`);
  console.log(`  Photos missing on disk:  ${counters.photos.missing || 0}`);
  console.log(`  Photos failed:           ${counters.photos.failed || 0}`);
  console.log('');
  console.log(`  Avatars scanned:         ${counters.avatarsScanned}`);
  console.log(`  Avatars touched:         ${counters.avatarsTouched}`);
  console.log(`  Avatars migrated:        ${counters.avatars.migrated || 0}`);
  console.log(`  Avatars already cloud:   ${counters.avatars.skipped || 0}`);
  console.log(`  Avatars missing on disk: ${counters.avatars.missing || 0}`);
  console.log(`  Avatars failed:          ${counters.avatars.failed || 0}`);
  console.log('─'.repeat(70));

  if (!COMMIT) {
    console.log('\nThis was a DRY-RUN. Re-run with `--commit` to actually upload &');
    console.log('write the new URLs back to the database.\n');
  } else {
    console.log('\nMigration complete. Old `/uploads/...` paths that resolved on disk');
    console.log('have been replaced with Cloudinary URLs. Anything marked');
    console.log('"missing on disk" is gone for good — repost those listings or wipe');
    console.log('them via the admin tools.\n');
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Migration crashed:', err);
  process.exit(1);
});
