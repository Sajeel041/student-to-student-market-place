const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, minlength: 6, maxlength: 80 },
  description: { type: String, maxlength: 600, default: '' },
  category: {
    type: String,
    required: true,
    enum: ['Textbooks', 'Furniture', 'Electronics', 'Clothing', 'Sports', 'Appliances', 'Other'],
  },
  courseCode: {
    type: String,
    default: null,
    validate: {
      validator: v => !v || /^[A-Z]{2,3}-?\d{3}$/i.test(v),
      message: 'Course code must be like MT-115 or CS316',
    },
  },
  condition: {
    type: String,
    required: true,
    enum: ['Like New', 'Good', 'Fair', 'For Parts'],
  },
  price: { type: Number, required: true, min: 50, max: 500000 },
  oldPrice: { type: Number, default: null },
  photos: [{ type: String }],
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pickup: { type: String, required: true },
  moveOut: { type: Boolean, default: false },
  openOffers: { type: Boolean, default: true },
  status: { type: String, enum: ['active', 'reserved', 'sold', 'archived'], default: 'active' },
  specs: { type: [[String]], default: [] },
  views: { type: Number, default: 0 },
  savedCount: { type: Number, default: 0 },
}, { timestamps: true });

listingSchema.index({ title: 'text', description: 'text', courseCode: 'text' });
listingSchema.index({ category: 1, status: 1 });
listingSchema.index({ seller: 1, status: 1 });

module.exports = mongoose.model('Listing', listingSchema);
