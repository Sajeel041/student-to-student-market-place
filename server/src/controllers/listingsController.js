const Listing = require('../models/Listing');
const User = require('../models/User');

// GET /api/listings
const getListings = async (req, res) => {
  try {
    const {
      q, category, condition, minPrice, maxPrice,
      pickup, moveOut, openOffers, sort = 'recent',
      page = 1, limit = 20,
    } = req.query;

    const filter = { status: 'active' };

    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { courseCode: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } },
      ];
    }
    if (category) filter.category = category;
    if (condition) filter.condition = condition;
    if (minPrice) filter.price = { ...filter.price, $gte: Number(minPrice) };
    if (maxPrice) filter.price = { ...filter.price, $lte: Number(maxPrice) };
    if (pickup) filter.pickup = { $regex: pickup, $options: 'i' };
    if (moveOut === 'true') filter.moveOut = true;
    if (openOffers === 'true') filter.openOffers = true;

    const sortMap = {
      recent: { createdAt: -1 },
      price_asc: { price: 1 },
      price_desc: { price: -1 },
      views: { views: -1 },
    };
    const sortObj = sortMap[sort] || { createdAt: -1 };

    const skip = (Number(page) - 1) * Number(limit);
    const [listings, total] = await Promise.all([
      Listing.find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(Number(limit))
        .populate('seller', 'name handle avatarUrl verified rating reviewCount'),
      Listing.countDocuments(filter),
    ]);

    return res.json({ listings, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/listings
const createListing = async (req, res) => {
  try {
    const { title, description, category, courseCode, condition, price, oldPrice, pickup, moveOut, openOffers, specs } = req.body;
    const photos = req.files ? req.files.map(f => `/uploads/listings/${f.filename}`) : [];

    const listing = await Listing.create({
      title, description, category,
      courseCode: courseCode || null,
      condition, price: Number(price),
      oldPrice: oldPrice ? Number(oldPrice) : null,
      photos, seller: req.user._id,
      pickup, moveOut: moveOut === 'true',
      openOffers: openOffers !== 'false',
      specs: specs ? JSON.parse(specs) : [],
    });

    await listing.populate('seller', 'name handle avatarUrl rating reviewCount');
    return res.status(201).json(listing);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error creating listing' });
  }
};

// GET /api/listings/:id
const getListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate('seller', 'name handle avatarUrl rating reviewCount dept batch verified response');
    if (!listing) return res.status(404).json({ message: 'Listing not found' });

    await Listing.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
    return res.json(listing);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /api/listings/:id
const updateListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });
    if (listing.seller.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to edit this listing' });
    }

    const allowed = ['title', 'description', 'category', 'courseCode', 'condition', 'price', 'oldPrice', 'pickup', 'moveOut', 'openOffers', 'status', 'specs'];
    allowed.forEach(k => { if (req.body[k] !== undefined) listing[k] = req.body[k]; });
    await listing.save();
    return res.json(listing);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/listings/:id
const deleteListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });
    if (listing.seller.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    listing.status = 'archived';
    await listing.save();
    return res.json({ message: 'Listing archived' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/listings/user/:userId
const getListingsByUser = async (req, res) => {
  try {
    const listings = await Listing.find({ seller: req.params.userId, status: 'active' })
      .sort({ createdAt: -1 })
      .populate('seller', 'name handle avatarUrl');
    return res.json(listings);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getListings, createListing, getListing, updateListing, deleteListing, getListingsByUser };
