const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  complainant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  againstUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  againstRole: { type: String, enum: ['buyer', 'seller'], required: true },

  subject: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, required: true, trim: true, maxlength: 3000 },

  status: { type: String, enum: ['open', 'in_review', 'resolved', 'rejected'], default: 'open' },
  adminNote: { type: String, trim: true, maxlength: 1000, default: '' },
}, { timestamps: true });

complaintSchema.index({ status: 1, createdAt: -1 });
complaintSchema.index({ complainant: 1, createdAt: -1 });
complaintSchema.index({ againstUser: 1, createdAt: -1 });

module.exports = mongoose.model('Complaint', complaintSchema);

