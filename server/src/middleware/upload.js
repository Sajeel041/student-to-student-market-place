const multer = require('multer');
const path = require('path');

const storage = (subfolder) => multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads', subfolder));
  },
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only JPEG, PNG, and WebP images are allowed'), false);
};

const uploadListingPhotos = multer({
  storage: storage('listings'),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 6 },
}).array('photos', 6);

const uploadAvatar = multer({
  storage: storage('avatars'),
  fileFilter,
  limits: { fileSize: 3 * 1024 * 1024, files: 1 },
}).single('avatar');

module.exports = { uploadListingPhotos, uploadAvatar };
