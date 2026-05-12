const Order = require('../models/Order');
const Listing = require('../models/Listing');
const User = require('../models/User');
const Notification = require('../models/Notification');
const PickupRequest = require('../models/PickupRequest');

const fmtPrice = (n) => `Rs. ${Number(n || 0).toLocaleString('en-PK')}`;

const parsePickupAt = (raw) => {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

// POST /api/orders
const createOrder = async (req, res) => {
  try {
    const {
      items, paymentMethod, pickupSlot, pickupLocation,
      pickupAt, pickupRequestId,
    } = req.body;

    if (!items || !items.length) return res.status(400).json({ message: 'No items in order' });
    if (!paymentMethod) return res.status(400).json({ message: 'Payment method required' });
    if (!pickupSlot) return res.status(400).json({ message: 'Pickup slot required' });
    if (!pickupLocation) return res.status(400).json({ message: 'Pickup location required' });
    if (!['card', 'jazzcash', 'easypaisa', 'cod'].includes(paymentMethod)) {
      return res.status(400).json({ message: 'Unsupported payment method.' });
    }

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
      const requestedPrice = Number(item?.price);
      const price = Number.isFinite(requestedPrice) && requestedPrice > 0 && requestedPrice <= l.price
        ? requestedPrice
        : l.price;
      return {
        listing: l._id,
        title: l.title,
        price,
        qty: 1, // qty is always 1 — listings represent individual items.
        seller: l.seller?._id || l.seller,
        sellerName: l.seller?.name || 'Seller',
        pickupLocation: item?.pickupLocation || l.pickup,
      };
    });

    const subtotal = orderItems.reduce((s, i) => s + i.price * i.qty, 0);
    const serviceFee = 50;
    const total = subtotal + serviceFee;

    // Single-seller per order in our flow (cart is built around 1 listing at
    // a time). If somehow mixed, we still store the first item's seller as
    // the top-level seller for indexing.
    const topSeller = orderItems[0]?.seller;

    const order = await Order.create({
      buyer: req.user._id,
      seller: topSeller,
      items: orderItems,
      total, serviceFee,
      paymentMethod,
      paymentStatus: paymentMethod === 'cod' ? 'cod_pending' : 'simulated',
      pickupSlot, pickupLocation,
      pickupAt: parsePickupAt(pickupAt),
      pickupRequest: pickupRequestId || null,
    });

    // Mark all listings as sold (taken off the marketplace immediately, even
    // for COD orders — the seller's commitment is signalled by accepting the
    // pickup time / receiving the order). We do NOT bump soldCount until the
    // actual pickup is confirmed (or auto-close).
    await Promise.all(
      listings.map(l => Listing.findByIdAndUpdate(l._id, { status: 'sold' })),
    );

    // Tell every involved seller a buyer placed an order. Different from a
    // chat notification — this drives their dashboard.
    const sellerIds = Array.from(new Set(orderItems.map(i => String(i.seller)).filter(Boolean)));
    await Promise.all(sellerIds.map(sid =>
      Notification.create({
        user: sid,
        type: 'system',
        title: 'New order placed',
        body: `${req.user.name || 'A buyer'} placed an order for ${fmtPrice(total)}. Pickup: ${pickupSlot}.`,
        url: `/order/${order._id}`,
        meta: { orderId: String(order._id) },
      })
    ));

    return res.status(201).json(order);
  } catch (err) {
    console.error('createOrder failed:', err);
    return res.status(500).json({ message: 'Server error placing order' });
  }
};

const populateOrder = (q) => q
  .populate('buyer', 'name email handle avatarUrl')
  .populate('seller', 'name email handle avatarUrl')
  .populate({
    path: 'items.listing',
    select: 'title photos seller',
    populate: { path: 'seller', select: 'name handle avatarUrl' },
  })
  .populate('items.seller', 'name handle avatarUrl');

// GET /api/orders — buyer's purchases
const getMyOrders = async (req, res) => {
  try {
    const orders = await populateOrder(
      Order.find({ buyer: req.user._id }).sort({ createdAt: -1 })
    );
    return res.json(orders);
  } catch (err) {
    console.error('getMyOrders failed:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/orders/sales — orders where the logged-in user is the seller
const getMySales = async (req, res) => {
  try {
    const orders = await populateOrder(
      Order.find({ seller: req.user._id }).sort({ createdAt: -1 })
    );
    return res.json(orders);
  } catch (err) {
    console.error('getMySales failed:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/orders/:id
const getOrder = async (req, res) => {
  try {
    const order = await populateOrder(Order.findById(req.params.id));
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const uid = req.user._id.toString();
    const isBuyer = order.buyer?._id?.toString() === uid;
    const isSeller = order.seller?._id?.toString() === uid;
    if (!isBuyer && !isSeller && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    return res.json(order);
  } catch (err) {
    console.error('getOrder failed:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /api/orders/:id/status — admin / system / legacy buyer pickup
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['placed', 'confirmed', 'picked_up', 'cancelled', 'disputed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const uid = req.user._id.toString();
    const isBuyer = order.buyer.toString() === uid;
    const isSeller = order.seller?.toString() === uid;
    const isAdmin = req.user.role === 'admin';
    if (!isBuyer && !isSeller && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const prevStatus = order.status;
    order.status = status;
    if (status === 'picked_up') {
      if (isBuyer) order.pickupConfirmation.buyerConfirmedAt = new Date();
      if (isSeller) order.pickupConfirmation.sellerConfirmedAt = new Date();
      if (prevStatus !== 'picked_up') await incrementSellerSold(order);
    }
    await order.save();
    return res.json(order);
  } catch (err) {
    console.error('updateOrderStatus failed:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Helper — increment the seller's sold counter. Callers are responsible for
// only invoking it on the status transition (not idempotently).
const incrementSellerSold = async (order) => {
  const sellerIds = Array.from(new Set(
    (order.items || []).map(i => String(i.seller || ''))
      .filter(Boolean)
  ));
  await Promise.all(sellerIds.map(sid =>
    User.findByIdAndUpdate(sid, { $inc: { soldCount: 1 } })
  ));
};

// POST /api/orders/:id/confirm-pickup  body: { confirmed: true|false }
// Either party can flip their side. Once *either* side confirms, the order
// is marked picked_up.
const confirmPickup = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const uid = req.user._id.toString();
    const isBuyer = order.buyer.toString() === uid;
    const isSeller = order.seller?.toString() === uid;
    if (!isBuyer && !isSeller) return res.status(403).json({ message: 'Not authorized' });

    if (order.status === 'auto_closed') {
      return res.status(400).json({ message: 'This order has already been auto-closed.' });
    }

    if (isBuyer) order.pickupConfirmation.buyerConfirmedAt = new Date();
    if (isSeller) order.pickupConfirmation.sellerConfirmedAt = new Date();
    const wasPickedUp = order.status === 'picked_up';
    order.status = 'picked_up';

    if (!wasPickedUp) await incrementSellerSold(order);
    await order.save();

    // Tell the other party so they can leave a review.
    const otherUserId = isBuyer ? order.seller : order.buyer;
    if (otherUserId) {
      await Notification.create({
        user: otherUserId,
        type: 'system',
        title: 'Pickup confirmed',
        body: isBuyer
          ? 'The buyer confirmed pickup. Please leave them a review.'
          : 'The seller confirmed pickup. Please leave them a review.',
        url: `/order/${order._id}`,
        meta: { orderId: String(order._id), kind: 'pickup_confirmed' },
      });
    }

    return res.json(order);
  } catch (err) {
    console.error('confirmPickup failed:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getMySales,
  getOrder,
  updateOrderStatus,
  confirmPickup,
};
