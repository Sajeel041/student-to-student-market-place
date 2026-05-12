const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reviewee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  // 'buyer_to_seller' is the original direction; 'seller_to_buyer' lets the
  // seller rate the buyer once pickup is confirmed.
  direction: {
    type: String,
    enum: ['buyer_to_seller', 'seller_to_buyer'],
    default: 'buyer_to_seller',
    index: true,
  },
  stars: { type: Number, required: true, min: 1, max: 5, validate: { validator: Number.isInteger } },
  text: { type: String, maxlength: 500, default: '' },
}, { timestamps: true });

// One review per order
reviewSchema.index({ reviewer: 1, order: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
