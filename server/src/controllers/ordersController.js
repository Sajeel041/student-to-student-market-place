const Order = require('../models/Order');
const Listing = require('../models/Listing');
const User = require('../models/User');

// POST /api/orders
const createOrder = async (req, res) => {
  try {
    const { items, paymentMethod, pickupSlot, pickupLocation } = req.body;

    if (!items || !items.length) return res.status(400).json({ message: 'No items in order' });
    if (!paymentMethod) return res.status(400).json({ message: 'Payment method required' });
    if (!pickupSlot) return res.status(400).json({ message: 'Pickup slot required' });
    if (!pickupLocation) return res.status(400).json({ message: 'Pickup location required' });

    // Accept either `listingId` or `listing` (the client sends `listing` to
    // match the Order.items schema). Filter out empties before querying.
    const normalized = items
      .map(i => ({
        ...i,
        listingId: String(i.listingId || i.listing || '').trim(),
      }))
      .filter(i => i.listingId);

    if (!normalized.length) {
      return res.status(400).json({ message: 'Order items are missing a listing reference.' });
    }

    const listingIds = normalized.map(i => i.listingId);
    const listings = await Listing.find({ _id: { $in: listingIds } })
      .populate('seller', 'name');

    // Detect specifically which listing failed so we can return a useful error.
    const foundIds = new Set(listings.map(l => l._id.toString()));
    const missing = normalized.filter(i => !foundIds.has(i.listingId));
    if (missing.length) {
      return res.status(400).json({
        message: 'One or more items could not be found.',
        missing: missing.map(i => i.listingId),
      });
    }

    const inactive = listings.filter(l => l.status !== 'active');
    if (inactive.length) {
      return res.status(400).json({
        message:
          inactive.length === 1
            ? `"${inactive[0].title}" is no longer available.`
            : `${inactive.length} items in your cart are no longer available.`,
        unavailable: inactive.map(l => ({ id: l._id, title: l.title, status: l.status })),
      });
    }

    const orderItems = listings.map(l => {
      const item = normalized.find(i => i.listingId === l._id.toString());
      // Allow the client to pass a negotiated/accepted offer price, but never
      // a price greater than the listing's own price.
      const requestedPrice = Number(item?.price);
      const price = Number.isFinite(requestedPrice) && requestedPrice > 0 && requestedPrice <= l.price
        ? requestedPrice
        : l.price;
      return {
        listing: l._id,
        title: l.title,
        price,
        qty: item?.qty || 1,
        sellerName: l.seller?.name || 'Seller',
        pickupLocation: item?.pickupLocation || l.pickup,
      };
    });

    const subtotal = orderItems.reduce((s, i) => s + i.price * i.qty, 0);
    const serviceFee = 50;
    const total = subtotal + serviceFee;

    const order = await Order.create({
      buyer: req.user._id,
      items: orderItems,
      total, serviceFee,
      paymentMethod, paymentStatus: 'simulated',
      pickupSlot, pickupLocation,
    });

    // Mark all listings as sold and update seller soldCount (in parallel).
    await Promise.all(
      listings.flatMap(l => [
        Listing.findByIdAndUpdate(l._id, { status: 'sold' }),
        User.findByIdAndUpdate(l.seller._id, { $inc: { soldCount: 1 } }),
      ])
    );

    return res.status(201).json(order);
  } catch (err) {
    console.error('createOrder failed:', err);
    return res.status(500).json({ message: 'Server error placing order' });
  }
};

// GET /api/orders
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ buyer: req.user._id })
      .sort({ createdAt: -1 })
      .populate({
        path: 'items.listing',
        select: 'title photos seller',
        populate: { path: 'seller', select: 'name handle avatarUrl' },
      });
    return res.json(orders);
  } catch (err) {
    console.error('getMyOrders failed:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/orders/:id
const getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('buyer', 'name email handle')
      .populate({
        path: 'items.listing',
        select: 'title photos seller',
        populate: { path: 'seller', select: 'name handle avatarUrl' },
      });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.buyer._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    return res.json(order);
  } catch (err) {
    console.error('getOrder failed:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /api/orders/:id/status
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['placed', 'confirmed', 'picked_up', 'cancelled', 'disputed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const isBuyer = order.buyer.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isBuyer && !isAdmin) return res.status(403).json({ message: 'Not authorized' });

    order.status = status;
    await order.save();
    return res.json(order);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { createOrder, getMyOrders, getOrder, updateOrderStatus };
