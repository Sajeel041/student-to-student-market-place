const express = require('express');
const verifyToken = require('../middleware/auth');
const {
  sendOffer,
  getMyOfferForListing,
  listOffersForListing,
  updateOfferStatus,
} = require('../controllers/offersController');

const router = express.Router();

router.post('/', verifyToken, sendOffer);
router.get('/listing/:listingId/mine', verifyToken, getMyOfferForListing);
router.get('/listing/:listingId', verifyToken, listOffersForListing);
router.patch('/:id', verifyToken, updateOfferStatus);

module.exports = router;

