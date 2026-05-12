const mongoose = require('mongoose');

// PickupRequest captures a buyer<->seller negotiation around a *custom*
// pickup time, separate from the preset slot pickers on the checkout page.
// The chat is the real conversation, but we keep the structured proposals
// here so the UI can show "waiting", "accept", "counter" affordances and
// finally lock a Date used when the order is placed.
const proposalSchema = new mongoose.Schema({
  by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  byRole: { type: String, enum: ['buyer', 'seller'], required: true },
  time: { type: Date, required: true },
  location: { type: String, default: '' },
  note: { type: String, default: '' },
  at: { type: Date, default: () => new Date() },
}, { _id: false });

const pickupRequestSchema = new mongoose.Schema({
  listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true, index: true },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  // The most recent proposal is the "current" one to accept or counter.
  proposals: { type: [proposalSchema], default: [] },
  // pending: someone is waiting on the other party.
  // accepted: both agreed; locked.
  // declined: one side gave up (rare, but useful for cleanup).
  status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending', index: true },
  // The party who needs to respond next. 'buyer' or 'seller'. When status is
  // accepted/declined this is null.
  awaitingFrom: { type: String, enum: ['buyer', 'seller', null], default: 'seller' },
  acceptedTime: { type: Date, default: null },
  acceptedLocation: { type: String, default: '' },
}, { timestamps: true });

// One in-flight pickup request per (listing, buyer). If a user wants to start
// a new negotiation they can decline or re-open by updating the existing doc.
pickupRequestSchema.index({ listing: 1, buyer: 1 }, { unique: true });

module.exports = mongoose.model('PickupRequest', pickupRequestSchema);
