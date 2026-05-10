const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lastMessageAt: { type: Date, default: null },
  lastMessagePreview: { type: String, default: '' },
}, { timestamps: true });

conversationSchema.index({ listing: 1, buyer: 1 }, { unique: true });
conversationSchema.index({ buyer: 1, lastMessageAt: -1, updatedAt: -1 });
conversationSchema.index({ seller: 1, lastMessageAt: -1, updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
