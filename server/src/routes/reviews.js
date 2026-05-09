const express = require('express');
const verifyToken = require('../middleware/auth');
const { createReview, getReviewsForUser } = require('../controllers/reviewsController');

const router = express.Router();

router.post('/', verifyToken, createReview);
router.get('/user/:userId', getReviewsForUser);

module.exports = router;
