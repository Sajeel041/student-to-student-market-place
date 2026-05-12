const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing' },
  title: String,
  price: Number,
  qty: { type: Number, default: 1 },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sellerName: String,
  pickupLocation: String,
}, { _id: false });

// Top-level `seller` on the order is denormalised from the first item — every
// order currently maps 1:1 with a listing, but we keep items[] for forward
// compatibility. We use it to query "sales" by seller without unwinding items.
const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    default: () => 'UNI-' + Math.random().toString(36).slice(2, 7).toUpperCase(),
  },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Denormalised from items[0].seller. Optional so legacy orders saved
  // before this field was introduced don't fail on subsequent updates.
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  items: [orderItemSchema],
  total: { type: Number, required: true },
  serviceFee: { type: Number, default: 50 },
  paymentMethod: { type: String, enum: ['card', 'jazzcash', 'easypaisa', 'cod'], required: true },
  paymentStatus: { type: String, enum: ['simulated', 'pending', 'failed', 'cod_pending'], default: 'simulated' },
  pickupSlot: { type: String, required: true },
  pickupLocation: { type: String, required: true },
  // Concrete Date the buyer & seller agreed on. Used for reminders & auto-close.
  pickupAt: { type: Date, default: null, index: true },
  // Snapshot of any negotiated custom-time used at checkout.
  pickupRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'PickupRequest', default: null },
  pickupConfirmation: {
    buyerConfirmedAt: { type: Date, default: null },
    sellerConfirmedAt: { type: Date, default: null },
    reminderSentAt: { type: Date, default: null },
    autoClosedAt: { type: Date, default: null },
  },
  status: {
    type: String,
    enum: ['placed', 'confirmed', 'picked_up', 'cancelled', 'disputed', 'auto_closed'],
    default: 'placed',
  },
  notes: { type: String, default: '' },
}, { timestamps: true });

orderSchema.index({ buyer: 1, createdAt: -1 });
orderSchema.index({ seller: 1, createdAt: -1 });
orderSchema.index({ status: 1, pickupAt: 1 });

module.exports = mongoose.model('Order', orderSchema);
