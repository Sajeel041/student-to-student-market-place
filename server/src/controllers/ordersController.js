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

    const listingIds = items.map(i => i.listingId);
    const listings = await Listing.find({ _id: { $in: listingIds }, status: 'active' })
      .populate('seller', 'name');

    if (listings.length !== items.length) {
      return res.status(400).json({ message: 'One or more items are no longer available' });
    }

    const orderItems = listings.map(l => {
      const item = items.find(i => i.listingId === l._id.toString());
      return {
        listing: l._id,
        title: l.title,
        price: l.price,
        qty: item?.qty || 1,
        sellerName: l.seller?.name || 'Seller',
        pickupLocation: l.pickup,
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

    // Mark all listings as sold and update seller soldCount
    for (const l of listings) {
      await Listing.findByIdAndUpdate(l._id, { status: 'sold' });
      await User.findByIdAndUpdate(l.seller._id, { $inc: { soldCount: 1 } });
    }

    return res.status(201).json(order);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error placing order' });
  }
};

// GET /api/orders
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ buyer: req.user._id })
      .sort({ createdAt: -1 })
      .populate('items.listing', 'title photos');
    return res.json(orders);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/orders/:id
const getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('buyer', 'name email handle')
      .populate('items.listing', 'title photos seller');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.buyer._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    return res.json(order);
  } catch (err) {
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
