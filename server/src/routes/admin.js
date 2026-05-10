const express = require('express');
const verifyToken = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const {
  getStats, getUsers, updateUser, deleteUser,
  getAdminListings, updateAdminListing, deleteAdminListing,
  getAdminOrders, updateAdminOrder,
} = require('../controllers/adminController');
const {
  listComplaints,
  updateComplaint,
  listAllConversations,
  listConversationMessages,
} = require('../controllers/adminModerationController');

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

router.get('/complaints', listComplaints);
router.patch('/complaints/:id', updateComplaint);

router.get('/conversations', listAllConversations);
router.get('/conversations/:id/messages', listConversationMessages);

module.exports = router;
