const express = require('express');
const verifyToken = require('../middleware/auth');
const {
  createReview,
  getReviewsForUser,
  getMyReviews,
} = require('../controllers/reviewsController');

const router = express.Router();

router.post('/', verifyToken, createReview);
router.get('/mine', verifyToken, getMyReviews);
router.get('/user/:userId', getReviewsForUser);

module.exports = router;
