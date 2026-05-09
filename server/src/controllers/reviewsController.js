const Review = require('../models/Review');
const Order = require('../models/Order');
const User = require('../models/User');

// POST /api/reviews
const createReview = async (req, res) => {
  try {
    const { revieweeId, listingId, orderId, stars, text } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.buyer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the buyer can leave a review' });
    }
    if (order.status !== 'picked_up') {
      return res.status(400).json({ message: 'Order must be picked up before reviewing' });
    }

    const existing = await Review.findOne({ reviewer: req.user._id, order: orderId });
    if (existing) return res.status(409).json({ message: 'Review already submitted for this order' });

    const review = await Review.create({
      reviewer: req.user._id,
      reviewee: revieweeId,
      listing: listingId,
      order: orderId,
      stars: Number(stars),
      text: text || '',
    });

    // Recalculate reviewee's average rating
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

module.exports = { createReview, getReviewsForUser };
