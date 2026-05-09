const express = require('express');
const verifyToken = require('../middleware/auth');
const { uploadAvatar } = require('../middleware/upload');
const { getUser, updateMe, toggleSave, getSaved } = require('../controllers/usersController');

const router = express.Router();

router.get('/me/saved', verifyToken, getSaved);
router.post('/me/saved/:listingId', verifyToken, toggleSave);
router.patch('/me', verifyToken, uploadAvatar, updateMe);
router.get('/:id', getUser);

module.exports = router;
