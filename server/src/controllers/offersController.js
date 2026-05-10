const Offer = require('../models/Offer');
const Listing = require('../models/Listing');
const Notification = require('../models/Notification');

// POST /api/offers
// body: { listingId, pct }
const sendOffer = async (req, res) => {
  try {
    const listingId = (req.body.listingId || '').toString();
    const pct = Number(req.body.pct);
    if (!listingId) return res.status(400).json({ message: 'listingId required' });
    if (!Number.isFinite(pct) || pct <= 0 || pct >= 100) {
      return res.status(400).json({ message: 'Invalid offer percentage' });
    }

    const listing = await Listing.findById(listingId).select('_id price seller status openOffers title');
    if (!listing) return res.status(404).json({ message: 'Listing not found' });
    if (listing.status !== 'active') return res.status(400).json({ message: 'Listing is not active' });
    if (!listing.openOffers) return res.status(400).json({ message: 'Offers are not enabled for this listing' });

    const buyerId = req.user._id.toString();
    const sellerId = listing.seller.toString();
    if (buyerId === sellerId) return res.status(400).json({ message: 'You cannot send an offer on your own listing' });

    const amount = Math.round(Number(listing.price) * (1 - pct / 100));
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: 'Invalid offer amount' });

    const existing = await Offer.findOne({ listing: listing._id, buyer: req.user._id }).lean();
    if (existing) return res.status(409).json({ message: 'Offer already sent for this listing' });

    const offer = await Offer.create({
      listing: listing._id,
      buyer: req.user._id,
      seller: listing.seller,
      pct: Math.round(pct),
      amount,
      status: 'sent',
    });

    await offer.populate([
      { path: 'listing', select: 'title price' },
      { path: 'buyer', select: 'name email handle avatarUrl' },
      { path: 'seller', select: 'name email handle avatarUrl' },
    ]);

    // Notify seller about new offer
    await Notification.create({
      user: listing.seller,
      type: 'offer',
      title: 'New offer received',
      body: `${offer.buyer?.name || 'A buyer'} offered ${offer.pct}% off on “${listing.title}”.`,
      url: `/listing/${listing._id}`,
      meta: { listingId: String(listing._id), offerId: String(offer._id), pct: offer.pct },
    });

    return res.status(201).json(offer);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Offer already sent for this listing' });
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/offers/listing/:listingId/mine
const getMyOfferForListing = async (req, res) => {
  try {
    const offer = await Offer.findOne({ listing: req.params.listingId, buyer: req.user._id })
      .sort({ createdAt: -1 })
      .populate('listing', 'title price')
      .lean();
    return res.json(offer || null);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/offers/listing/:listingId (seller only)
const listOffersForListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.listingId).select('_id seller');
    if (!listing) return res.status(404).json({ message: 'Listing not found' });
    if (listing.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const offers = await Offer.find({ listing: listing._id })
      .sort({ createdAt: -1 })
      .populate('buyer', 'name email handle avatarUrl')
      .lean();
    return res.json(offers);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /api/offers/:id  body: { status }
const updateOfferStatus = async (req, res) => {
  try {
    const status = (req.body.status || '').toString();
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ message: 'Offer not found' });
    if (offer.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    offer.status = status;
    await offer.save();
    await offer.populate('buyer', 'name email handle avatarUrl');

    // Notify buyer about seller decision
    const listing = await Listing.findById(offer.listing).select('_id title');
    await Notification.create({
      user: offer.buyer,
      type: 'offer',
      title: status === 'accepted' ? 'Offer accepted' : 'Offer rejected',
      body: listing?.title ? `Your offer on “${listing.title}” was ${status}.` : `Your offer was ${status}.`,
      url: listing?._id ? `/listing/${listing._id}` : '',
      meta: { listingId: listing?._id ? String(listing._id) : undefined, offerId: String(offer._id), status },
    });

    return res.json(offer);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  sendOffer,
  getMyOfferForListing,
  listOffersForListing,
  updateOfferStatus,
};

