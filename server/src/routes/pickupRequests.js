const express = require('express');
const verifyToken = require('../middleware/auth');
const {
  createPickupRequest,
  getMyRequestForListing,
  listForListing,
  acceptRequest,
  counterRequest,
  declineRequest,
} = require('../controllers/pickupRequestsController');

const router = express.Router();

router.post('/', verifyToken, createPickupRequest);
router.get('/listing/:listingId/mine', verifyToken, getMyRequestForListing);
router.get('/listing/:listingId', verifyToken, listForListing);
router.patch('/:id/accept', verifyToken, acceptRequest);
router.patch('/:id/counter', verifyToken, counterRequest);
router.patch('/:id/decline', verifyToken, declineRequest);

module.exports = router;
