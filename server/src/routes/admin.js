const express = require('express');
const verifyToken = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const {
  getStats, getUsers, updateUser, deleteUser,
  getAdminListings, updateAdminListing, deleteAdminListing,
  getAdminOrders, updateAdminOrder,
} = require('../controllers/adminController');

const router = express.Router();

router.use(verifyToken, requireAdmin);

router.get('/stats', getStats);

router.get('/users', getUsers);
router.patch('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

router.get('/listings', getAdminListings);
router.patch('/listings/:id', updateAdminListing);
router.delete('/listings/:id', deleteAdminListing);

router.get('/orders', getAdminOrders);
router.patch('/orders/:id', updateAdminOrder);

module.exports = router;
