const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^u\d{4}\d{3,5}@giki\.edu\.pk$/i, 'Must be a valid GIKI email (e.g. u2023633@giki.edu.pk)'],
  },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
  handle: { type: String, unique: true, trim: true },
  dept: { type: String, enum: ['CS', 'EE', 'CV', 'ME', 'BBA', 'Other'], default: 'Other' },
  batch: { type: String, default: '' },
  bio: { type: String, maxlength: 300, default: '' },
  avatarUrl: { type: String, default: null },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  savedListings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Listing' }],
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0 },
  soldCount: { type: Number, default: 0 },
  banned: { type: Boolean, default: false },
}, { timestamps: true });

// Auto-derive handle from email local part
userSchema.pre('save', function (next) {
  if (this.isNew && !this.handle) {
    this.handle = this.email.split('@')[0];
  }
  next();
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.methods.toPublic = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
