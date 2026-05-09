const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing' },
  title: String,
  price: Number,
  qty: { type: Number, default: 1 },
  sellerName: String,
  pickupLocation: String,
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    default: () => 'UNI-' + Math.random().toString(36).slice(2, 7).toUpperCase(),
  },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [orderItemSchema],
  total: { type: Number, required: true },
  serviceFee: { type: Number, default: 50 },
  paymentMethod: { type: String, enum: ['card', 'jazzcash', 'easypaisa'], required: true },
  paymentStatus: { type: String, enum: ['simulated', 'pending', 'failed'], default: 'simulated' },
  pickupSlot: { type: String, required: true },
  pickupLocation: { type: String, required: true },
  status: {
    type: String,
    enum: ['placed', 'confirmed', 'picked_up', 'cancelled', 'disputed'],
    default: 'placed',
  },
  notes: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
