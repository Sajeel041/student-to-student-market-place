const multer = require('multer');
const path = require('path');
const { cloudinary, enabled: cloudinaryEnabled } = require('../config/cloudinary');

// ──────────────────────────────────────────────────────────────────────────
// Storage strategy
// ──────────────────────────────────────────────────────────────────────────
// When Cloudinary credentials are present we buffer the upload in memory and
// stream it straight to Cloudinary after multer is done. The resulting secure
// URL is stamped onto `file.path` so downstream controllers can treat both
// strategies uniformly via `photoUrlFromFile(file)` below.
//
// Without Cloudinary creds we fall back to multer's diskStorage so local dev
// works without a Cloudinary account.

const diskStorage = (subfolder) => multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads', subfolder));
  },
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  },
});

const memoryStorage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only JPEG, PNG, and WebP images are allowed'), false);
};

// Upload a single in-memory file buffer to Cloudinary. Returns a promise that
// resolves to the secure HTTPS URL of the stored asset.
const streamToCloudinary = (buffer, folder) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `uniswap/${folder}`,
        resource_type: 'image',
        transformation: [
          // Auto-pick best format (webp/avif when supported) and quality.
          { quality: 'auto:good', fetch_format: 'auto' },
          // Hard cap to keep gallery thumbnails snappy — original aspect kept.
          { width: 1600, height: 1600, crop: 'limit' },
        ],
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });

// Express middleware that, after multer has populated req.file(s), uploads
// the buffered bytes to Cloudinary and rewrites `file.path` with the URL.
const pushToCloudinary = (folder, mode /* 'single' | 'array' */) =>
  async function cloudinaryUploader(req, res, next) {
    if (!cloudinaryEnabled) return next();
    try {
      const files = mode === 'single'
        ? (req.file ? [req.file] : [])
        : (req.files || []);
      for (const f of files) {
        const url = await streamToCloudinary(f.buffer, folder);
        f.path = url;       // unified accessor for controllers
        f.filename = url;   // legacy field, just in case
        delete f.buffer;    // free memory before the controller runs
      }
      next();
    } catch (err) {
      console.error('Cloudinary upload failed:', err);
      next(new Error('Image upload failed. Please try again.'));
    }
  };

// Build the final multer handler for a route. `mode` is either 'single' or
// 'array'; `field` is the form field name; `max` caps array length.
const buildHandler = ({ folder, field, mode, max, sizeMb }) => {
  const storage = cloudinaryEnabled ? memoryStorage : diskStorage(folder);
  const limits = { fileSize: sizeMb * 1024 * 1024 };
  if (mode === 'array') limits.files = max;

  const multerInst = multer({ storage, fileFilter, limits });
  const multerMw = mode === 'array'
    ? multerInst.array(field, max)
    : multerInst.single(field);

  // Chain: multer (memory or disk) → optional cloudinary upload.
  return (req, res, next) => {
    multerMw(req, res, (err) => {
      if (err) return next(err);
      return pushToCloudinary(folder, mode)(req, res, next);
    });
  };
};

const uploadListingPhotos = buildHandler({
  folder: 'listings',
  field: 'photos',
  mode: 'array',
  max: 6,
  sizeMb: 5,
});

const uploadAvatar = buildHandler({
  folder: 'avatars',
  field: 'avatar',
  mode: 'single',
  max: 1,
  sizeMb: 3,
});

// Helper consumed by controllers — turns an uploaded multer file (either disk
// or cloudinary) into the URL to persist on the model.
const photoUrlFromFile = (file, fallbackFolder) => {
  if (!file) return null;
  // Cloudinary path is already a full https URL — use it directly.
  if (file.path && /^https?:\/\//i.test(file.path)) return file.path;
  // Disk fallback: build the /uploads/... static path.
  return `/uploads/${fallbackFolder}/${file.filename}`;
};

module.exports = {
  uploadListingPhotos,
  uploadAvatar,
  photoUrlFromFile,
  cloudinaryEnabled,
};
