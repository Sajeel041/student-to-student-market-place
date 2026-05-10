const Complaint = require('../models/Complaint');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

// GET /api/admin/complaints
const listComplaints = async (req, res) => {
  try {
    const { status, q, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    // lightweight search: subject contains q
    if (q) filter.subject = { $regex: q, $options: 'i' };

    const skip = (Number(page) - 1) * Number(limit);
    const [rows, total] = await Promise.all([
      Complaint.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('complainant', 'name email')
        .populate('againstUser', 'name email')
        .lean(),
      Complaint.countDocuments(filter),
    ]);

    return res.json({ complaints: rows, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /api/admin/complaints/:id
const updateComplaint = async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const allowed = ['open', 'in_review', 'resolved', 'rejected'];
    const patch = {};
    if (status !== undefined) {
      if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status' });
      patch.status = status;
    }
    if (adminNote !== undefined) patch.adminNote = String(adminNote || '').slice(0, 1000);

    const c = await Complaint.findByIdAndUpdate(req.params.id, patch, { new: true })
      .populate('complainant', 'name email')
      .populate('againstUser', 'name email');
    if (!c) return res.status(404).json({ message: 'Complaint not found' });
    return res.json(c);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/admin/conversations
const listAllConversations = async (req, res) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const [rows, total] = await Promise.all([
      Conversation.find()
        .sort({ lastMessageAt: -1, updatedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('listing', 'title photos status price')
        .populate('buyer', 'name email handle')
        .populate('seller', 'name email handle')
        .lean(),
      Conversation.countDocuments(),
    ]);
    return res.json({ conversations: rows, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/admin/conversations/:id/messages
const listConversationMessages = async (req, res) => {
  try {
    const { limit = 300 } = req.query;
    const messages = await Message.find({ conversation: req.params.id })
      .sort({ createdAt: 1 })
      .limit(Math.min(Number(limit) || 300, 800))
      .populate('sender', 'name email avatarUrl')
      .lean();
    return res.json(messages.map(m => ({
      _id: m._id,
      body: m.body,
      createdAt: m.createdAt,
      sender: m.sender ? { _id: m.sender._id, name: m.sender.name, email: m.sender.email, avatarUrl: m.sender.avatarUrl } : null,
    })));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  listComplaints,
  updateComplaint,
  listAllConversations,
  listConversationMessages,
};

