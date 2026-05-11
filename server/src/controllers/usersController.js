const User = require('../models/User');
const Listing = require('../models/Listing');
const { photoUrlFromFile } = require('../middleware/upload');

// GET /api/users/:id
const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('name handle dept batch bio avatarUrl rating reviewCount soldCount createdAt');
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json(user);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /api/users/me
const updateMe = async (req, res) => {
  try {
    const allowed = ['name', 'dept', 'batch', 'bio'];
    allowed.forEach(k => {
      if (req.body[k] !== undefined) req.user[k] = req.body[k];
    });
    if (req.file) {
      req.user.avatarUrl = photoUrlFromFile(req.file, 'avatars');
    }
    await req.user.save();
    return res.json(req.user.toPublic());
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/users/me/saved/:listingId
const toggleSave = async (req, res) => {
  try {
    const { listingId } = req.params;
    const user = await User.findById(req.user._id);
    const idx = user.savedListings.findIndex(id => id.toString() === listingId);
    let saved;
    if (idx === -1) {
      user.savedListings.push(listingId);
      await Listing.findByIdAndUpdate(listingId, { $inc: { savedCount: 1 } });
      saved = true;
    } else {
      user.savedListings.splice(idx, 1);
      await Listing.findByIdAndUpdate(listingId, { $inc: { savedCount: -1 } });
      saved = false;
    }
    await user.save();
    return res.json({ saved, savedListings: user.savedListings });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/users/me/saved
const getSaved = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'savedListings',
      populate: { path: 'seller', select: 'name handle avatarUrl' },
    });
    return res.json(user.savedListings);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getUser, updateMe, toggleSave, getSaved };
