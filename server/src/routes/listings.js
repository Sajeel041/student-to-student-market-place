const express = require('express');
const verifyToken = require('../middleware/auth');
const { uploadListingPhotos } = require('../middleware/upload');
const {
  getListings, createListing, getListing,
  updateListing, deleteListing, getListingsByUser, getMyListings,
} = require('../controllers/listingsController');

const router = express.Router();

router.get('/', getListings);
router.post('/', verifyToken, uploadListingPhotos, createListing);
router.get('/mine', verifyToken, getMyListings);
router.get('/user/:userId', getListingsByUser);
router.get('/:id', getListing);
router.patch('/:id', verifyToken, updateListing);
router.delete('/:id', verifyToken, deleteListing);

module.exports = router;
