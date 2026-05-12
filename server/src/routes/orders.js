const express = require('express');
const verifyToken = require('../middleware/auth');
const {
  createOrder,
  getMyOrders,
  getMySales,
  getOrder,
  updateOrderStatus,
  confirmPickup,
} = require('../controllers/ordersController');

const router = express.Router();

router.post('/', verifyToken, createOrder);
router.get('/', verifyToken, getMyOrders);
router.get('/sales', verifyToken, getMySales);
router.get('/:id', verifyToken, getOrder);
router.patch('/:id/status', verifyToken, updateOrderStatus);
router.post('/:id/confirm-pickup', verifyToken, confirmPickup);

module.exports = router;
