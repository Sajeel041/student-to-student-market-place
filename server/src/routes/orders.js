const express = require('express');
const verifyToken = require('../middleware/auth');
const { createOrder, getMyOrders, getOrder, updateOrderStatus } = require('../controllers/ordersController');

const router = express.Router();

router.post('/', verifyToken, createOrder);
router.get('/', verifyToken, getMyOrders);
router.get('/:id', verifyToken, getOrder);
router.patch('/:id/status', verifyToken, updateOrderStatus);

module.exports = router;
