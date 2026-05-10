const express = require('express');
const verifyToken = require('../middleware/auth');
const { createComplaint, listMyComplaints } = require('../controllers/complaintsController');

const router = express.Router();

router.post('/', verifyToken, createComplaint);
router.get('/mine', verifyToken, listMyComplaints);

module.exports = router;

