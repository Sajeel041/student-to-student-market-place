const Review = require('../models/Review');
const Order = require('../models/Order');
const User = require('../models/User');

// POST /api/reviews
// body: { revieweeId, listingId, orderId, stars, text }
// Either the buyer or the seller of a picked_up order may post one review
// for the other (direction is inferred from role on the order).
const createReview = async (req, res) => {
  try {
    const { revieweeId, listingId, orderId, stars, text } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const uid = req.user._id.toString();
    const isBuyer = order.buyer.toString() === uid;
    const isSeller = order.seller?.toString() === uid;
    if (!isBuyer && !isSeller) {
      return res.status(403).json({ message: 'Only the buyer or seller can leave a review.' });
    }
    if (order.status !== 'picked_up') {
      return res.status(400).json({ message: 'Pickup must be confirmed before reviewing.' });
    }

    const direction = isBuyer ? 'buyer_to_seller' : 'seller_to_buyer';

    // Reviewee should match the other party on the order to avoid stuffing.
    const expectedReviewee = isBuyer ? order.seller : order.buyer;
    if (expectedReviewee && String(expectedReviewee) !== String(revieweeId)) {
      return res.status(400).json({ message: 'Reviewee does not match the other party on this order.' });
    }

    const existing = await Review.findOne({ reviewer: req.user._id, order: orderId });
    if (existing) return res.status(409).json({ message: 'Review already submitted for this order.' });

    const review = await Review.create({
      reviewer: req.user._id,
      reviewee: revieweeId,
      listing: listingId,
      order: orderId,
      direction,
      stars: Number(stars),
      text: text || '',
    });

    // Recalculate reviewee's rolling average across all reviews they received.
    const allReviews = await Review.find({ reviewee: revieweeId });
    const avg = allReviews.reduce((s, r) => s + r.stars, 0) / allReviews.length;
    await User.findByIdAndUpdate(revieweeId, {
      rating: Math.round(avg * 10) / 10,
      reviewCount: allReviews.length,
    });

    await review.populate('reviewer', 'name handle avatarUrl');
    return res.status(201).json(review);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Already reviewed' });
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/reviews/user/:userId
const getReviewsForUser = async (req, res) => {
  try {
    const reviews = await Review.find({ reviewee: req.params.userId })
      .sort({ createdAt: -1 })
      .populate('reviewer', 'name handle avatarUrl');
    return res.json(reviews);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/reviews/mine — reviews authored by the logged-in user, used to
// hide the "leave review" button for orders they've already rated.
const getMyReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ reviewer: req.user._id })
      .sort({ createdAt: -1 })
      .populate('reviewee', 'name handle avatarUrl');
    return res.json(reviews);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { createReview, getReviewsForUser, getMyReviews };
