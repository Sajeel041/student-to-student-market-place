const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Listing = require('../models/Listing');
const Notification = require('../models/Notification');

function toPublicUser(u) {
  if (!u) return null;
  const o = typeof u.toObject === 'function' ? u.toObject() : u;
  return {
    _id: o._id,
    name: o.name,
    handle: o.handle,
    avatarUrl: o.avatarUrl,
  };
}

function refUserId(ref) {
  if (ref == null) return '';
  if (typeof ref === 'object' && ref._id != null) return String(ref._id);
  return String(ref);
}

function formatConversation(doc, userId) {
  const c = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  const uid = userId.toString();
  const buyerId = refUserId(c.buyer);
  const isBuyer = buyerId === uid;
  const peer = isBuyer ? c.seller : c.buyer;
  return {
    _id: c._id,
    listing: c.listing,
    peer: toPublicUser(peer),
    youAreBuyer: isBuyer,
    lastMessagePreview: c.lastMessagePreview || null,
    lastMessageAt: c.lastMessageAt,
    updatedAt: c.updatedAt,
  };
}

// GET /api/conversations
const listConversations = async (req, res) => {
  try {
    const uid = req.user._id;
    const convs = await Conversation.find({ $or: [{ buyer: uid }, { seller: uid }] })
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .populate('listing', 'title photos status price')
      .populate('buyer', 'name handle avatarUrl')
      .populate('seller', 'name handle avatarUrl');
    return res.json(convs.map((c) => formatConversation(c, uid)));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/conversations  { listingId }
const startConversation = async (req, res) => {
  try {
    const { listingId } = req.body;
    if (!listingId) return res.status(400).json({ message: 'listingId required' });

    const listing = await Listing.findById(listingId);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });

    if (listing.seller.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot message yourself' });
    }

    let conv = await Conversation.findOne({ listing: listingId, buyer: req.user._id });
    let created = false;
    if (!conv) {
      conv = await Conversation.create({
        listing: listingId,
        buyer: req.user._id,
        seller: listing.seller,
        lastMessageAt: new Date(),
      });
      created = true;
    }

    await conv.populate([
      { path: 'listing', select: 'title photos status price' },
      { path: 'buyer', select: 'name handle avatarUrl' },
      { path: 'seller', select: 'name handle avatarUrl' },
    ]);

    return res.status(created ? 201 : 200).json(formatConversation(conv, req.user._id));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/conversations/:id
const getConversation = async (req, res) => {
  try {
    const conv = await Conversation.findById(req.params.id)
      .populate('listing', 'title photos status price pickup')
      .populate('buyer', 'name handle avatarUrl')
      .populate('seller', 'name handle avatarUrl');
    if (!conv) return res.status(404).json({ message: 'Conversation not found' });

    const uid = req.user._id.toString();
    if (conv.buyer._id.toString() !== uid && conv.seller._id.toString() !== uid) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    return res.json(formatConversation(conv, req.user._id));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/conversations/:id/messages
const listMessages = async (req, res) => {
  try {
    const conv = await Conversation.findById(req.params.id);
    if (!conv) return res.status(404).json({ message: 'Conversation not found' });

    const uid = req.user._id.toString();
    if (conv.buyer.toString() !== uid && conv.seller.toString() !== uid) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const messages = await Message.find({ conversation: conv._id })
      .sort({ createdAt: 1 })
      .limit(300)
      .populate('sender', 'name avatarUrl')
      .lean();

    const out = messages.map((m) => ({
      _id: m._id,
      body: m.body,
      createdAt: m.createdAt,
      sender: toPublicUser(m.sender),
      isMine: m.sender._id.toString() === uid,
    }));

    return res.json(out);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/conversations/:id/messages  { body }
const sendMessage = async (req, res) => {
  try {
    const raw = (req.body.body ?? req.body.text ?? '').toString();
    const body = raw.trim();
    if (!body) return res.status(400).json({ message: 'Message cannot be empty' });
    if (body.length > 2000) return res.status(400).json({ message: 'Message too long' });

    const conv = await Conversation.findById(req.params.id);
    if (!conv) return res.status(404).json({ message: 'Conversation not found' });

    const uid = req.user._id.toString();
    if (conv.buyer.toString() !== uid && conv.seller.toString() !== uid) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const msg = await Message.create({
      conversation: conv._id,
      sender: req.user._id,
      body,
    });

    conv.lastMessageAt = new Date();
    conv.lastMessagePreview = body.slice(0, 120);
    await conv.save();

    // Notify the other participant
    const senderId = req.user._id.toString();
    const recipientId = conv.buyer.toString() === senderId ? conv.seller : conv.buyer;
    if (recipientId && recipientId.toString() !== senderId) {
      await Notification.create({
        user: recipientId,
        type: 'message',
        title: 'New message',
        body: body.slice(0, 140),
        url: `/chat/${conv._id}`,
        meta: { conversationId: String(conv._id), listingId: String(conv.listing) },
      });
    }

    await msg.populate('sender', 'name avatarUrl');
    const m = msg.toObject();
    return res.status(201).json({
      _id: m._id,
      body: m.body,
      createdAt: m.createdAt,
      sender: toPublicUser(m.sender),
      isMine: true,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  listConversations,
  startConversation,
  getConversation,
  listMessages,
  sendMessage,
};
