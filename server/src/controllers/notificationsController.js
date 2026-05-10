const Notification = require('../models/Notification');

// GET /api/notifications?unread=1&limit=20&cursor=<iso date>
const listNotifications = async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 20));
    const unreadOnly = String(req.query.unread || '') === '1';
    const cursor = (req.query.cursor || '').toString();

    const filter = { user: req.user._id };
    if (unreadOnly) filter.readAt = null;
    if (cursor) filter.createdAt = { $lt: new Date(cursor) };

    const rows = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const nextCursor = rows.length ? rows[rows.length - 1].createdAt.toISOString() : null;
    return res.json({ items: rows, nextCursor });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/notifications/unread-count
const getUnreadCount = async (req, res) => {
  try {
    const type = (req.query.type || '').toString().trim();
    const filter = { user: req.user._id, readAt: null };
    if (type) filter.type = type;
    const count = await Notification.countDocuments(filter);
    return res.json({ unread: count });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/notifications/mark-read  body: { ids?: string[] }  (omit ids => mark all)
const markRead = async (req, res) => {
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids.map(String).filter(Boolean) : null;
    const now = new Date();
    const filter = { user: req.user._id, readAt: null };
    if (ids && ids.length) filter._id = { $in: ids };

    const result = await Notification.updateMany(filter, { $set: { readAt: now } });
    return res.json({ ok: true, modified: result.modifiedCount || result.nModified || 0 });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { listNotifications, getUnreadCount, markRead };

