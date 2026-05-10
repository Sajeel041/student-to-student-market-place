const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pct: { type: Number, required: true, min: 1, max: 90 },
  amount: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ['sent', 'accepted', 'rejected'], default: 'sent' },
}, { timestamps: true });

// Only one active offer per buyer per listing (matches "don't allow send again")
offerSchema.index({ listing: 1, buyer: 1 }, { unique: true });
offerSchema.index({ seller: 1, listing: 1, createdAt: -1 });

module.exports = mongoose.model('Offer', offerSchema);

