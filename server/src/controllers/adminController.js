const User = require('../models/User');
const Listing = require('../models/Listing');
const Order = require('../models/Order');

// GET /api/admin/stats
const getStats = async (req, res) => {
  try {
    const [totalUsers, totalListings, totalOrders, categoryAgg, recentOrders] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Listing.countDocuments({ status: 'active' }),
      Order.countDocuments(),
      Listing.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Order.find().sort({ createdAt: -1 }).limit(5)
        .populate('buyer', 'name email')
        .select('orderNumber buyer total status createdAt paymentMethod'),
    ]);

    const revenue = await Order.aggregate([
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);

    return res.json({
      totalUsers,
      totalListings,
      totalOrders,
      totalRevenue: revenue[0]?.total || 0,
      categoryBreakdown: categoryAgg.map(c => ({ category: c._id, count: c.count })),
      recentOrders,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/admin/users
const getUsers = async (req, res) => {
  try {
    const { q, role, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (q) filter.$or = [
      { name: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
    ];
    if (role) filter.role = role;

    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
      User.find(filter).select('-passwordHash').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      User.countDocuments(filter),
    ]);
    return res.json({ users, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /api/admin/users/:id
const updateUser = async (req, res) => {
  try {
    const { role, banned } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (role) user.role = role;
    if (banned !== undefined) user.banned = banned;
    await user.save();
    return res.json(user.toPublic());
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/admin/users/:id
const deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    await Listing.updateMany({ seller: req.params.id }, { status: 'archived' });
    return res.json({ message: 'User deleted' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/admin/listings
const getAdminListings = async (req, res) => {
  try {
    const { status, category, q, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) {
      // Allow comma-separated lists e.g. "sold,archived"
      const list = String(status).split(',').map(s => s.trim()).filter(Boolean);
      filter.status = list.length > 1 ? { $in: list } : list[0];
    }
    if (category) filter.category = category;
    if (q) filter.title = { $regex: q, $options: 'i' };

    const skip = (Number(page) - 1) * Number(limit);
    const [listings, total] = await Promise.all([
      Listing.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit))
        .populate('seller', 'name email'),
      Listing.countDocuments(filter),
    ]);
    return res.json({ listings, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /api/admin/listings/:id
const updateAdminListing = async (req, res) => {
  try {
    const listing = await Listing.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!listing) return res.status(404).json({ message: 'Listing not found' });
    return res.json(listing);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/admin/listings/:id
const deleteAdminListing = async (req, res) => {
  try {
    await Listing.findByIdAndDelete(req.params.id);
    return res.json({ message: 'Listing deleted' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/admin/orders
const getAdminOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const [orders, total] = await Promise.all([
      Order.find().sort({ createdAt: -1 }).skip(skip).limit(Number(limit))
        .populate('buyer', 'name email'),
      Order.countDocuments(),
    ]);
    return res.json({ orders, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /api/admin/orders/:id
const updateAdminOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    return res.json(order);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getStats, getUsers, updateUser, deleteUser,
  getAdminListings, updateAdminListing, deleteAdminListing,
  getAdminOrders, updateAdminOrder,
};
