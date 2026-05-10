const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      required: true,
      enum: ['message', 'offer', 'system'],
      index: true,
    },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    url: { type: String, default: '' }, // client route e.g. /chat/:id
    meta: { type: Object, default: {} }, // lightweight extra data
    readAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

NotificationSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);

