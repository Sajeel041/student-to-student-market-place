const PickupRequest = require('../models/PickupRequest');
const Listing = require('../models/Listing');
const Notification = require('../models/Notification');

const POPULATE = [
  { path: 'listing', select: 'title photos price seller' },
  { path: 'buyer', select: 'name handle avatarUrl' },
  { path: 'seller', select: 'name handle avatarUrl' },
];

const fmtTime = (d) => {
  try {
    return new Date(d).toLocaleString('en-PK', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
  } catch {
    return new Date(d).toString();
  }
};

const parseTime = (raw) => {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  // Reject times in the past (with a small grace window for clock drift).
  if (d.getTime() < Date.now() - 60_000) return null;
  return d;
};

// POST /api/pickup-requests  body: { listingId, time, location, note }
// Only the buyer can start the negotiation. We treat re-posting as a
// counter when one already exists.
const createPickupRequest = async (req, res) => {
  try {
    const { listingId, time, location, note } = req.body;
    if (!listingId) return res.status(400).json({ message: 'listingId required' });

    const when = parseTime(time);
    if (!when) return res.status(400).json({ message: 'Pick a future date and time.' });

    const listing = await Listing.findById(listingId).select('_id seller status title');
    if (!listing) return res.status(404).json({ message: 'Listing not found' });
    if (listing.status !== 'active' && listing.status !== 'reserved') {
      return res.status(400).json({ message: 'Listing is not available' });
    }
    if (listing.seller.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot request your own listing' });
    }

    let pr = await PickupRequest.findOne({ listing: listingId, buyer: req.user._id });
    const proposal = {
      by: req.user._id,
      byRole: 'buyer',
      time: when,
      location: (location || '').trim(),
      note: (note || '').trim(),
      at: new Date(),
    };

    if (!pr) {
      pr = await PickupRequest.create({
        listing: listingId,
        buyer: req.user._id,
        seller: listing.seller,
        proposals: [proposal],
        status: 'pending',
        awaitingFrom: 'seller',
      });
    } else {
      pr.proposals.push(proposal);
      pr.status = 'pending';
      pr.awaitingFrom = 'seller';
      pr.acceptedTime = null;
      pr.acceptedLocation = '';
      await pr.save();
    }

    await pr.populate(POPULATE);

    await Notification.create({
      user: listing.seller,
      type: 'pickup',
      title: 'Pickup time proposed',
      body: `${pr.buyer?.name || 'A buyer'} proposed ${fmtTime(when)} for "${listing.title}".`,
      url: `/listing/${listingId}`,
      meta: {
        listingId: String(listingId),
        pickupRequestId: String(pr._id),
        kind: 'proposed',
      },
    });

    return res.status(201).json(pr);
  } catch (err) {
    console.error('createPickupRequest failed:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/pickup-requests/listing/:listingId/mine — buyer view
const getMyRequestForListing = async (req, res) => {
  try {
    const pr = await PickupRequest.findOne({
      listing: req.params.listingId,
      buyer: req.user._id,
    }).populate(POPULATE);
    return res.json(pr || null);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/pickup-requests/listing/:listingId — seller view (all buyers)
const listForListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.listingId).select('seller');
    if (!listing) return res.status(404).json({ message: 'Listing not found' });
    if (listing.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const prs = await PickupRequest.find({ listing: req.params.listingId })
      .sort({ updatedAt: -1 })
      .populate(POPULATE);
    return res.json(prs);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /api/pickup-requests/:id/accept
const acceptRequest = async (req, res) => {
  try {
    const pr = await PickupRequest.findById(req.params.id).populate(POPULATE);
    if (!pr) return res.status(404).json({ message: 'Pickup request not found' });

    const uid = req.user._id.toString();
    const isBuyer = String(pr.buyer?._id || pr.buyer) === uid;
    const isSeller = String(pr.seller?._id || pr.seller) === uid;
    if (!isBuyer && !isSeller) return res.status(403).json({ message: 'Not authorized' });

    const expecting = pr.awaitingFrom;
    if ((expecting === 'buyer' && !isBuyer) || (expecting === 'seller' && !isSeller)) {
      return res.status(400).json({ message: 'You are not the one to respond to this proposal.' });
    }
    if (pr.status === 'accepted') return res.json(pr);

    const last = pr.proposals[pr.proposals.length - 1];
    if (!last) return res.status(400).json({ message: 'No proposal to accept.' });

    pr.status = 'accepted';
    pr.awaitingFrom = null;
    pr.acceptedTime = last.time;
    pr.acceptedLocation = last.location;
    await pr.save();

    // Notify the other party
    const otherUserId = isBuyer
      ? (pr.seller?._id || pr.seller)
      : (pr.buyer?._id || pr.buyer);
    await Notification.create({
      user: otherUserId,
      type: 'pickup',
      title: 'Pickup time accepted',
      body: `Pickup locked for ${fmtTime(pr.acceptedTime)}${pr.acceptedLocation ? ` at ${pr.acceptedLocation}` : ''}.`,
      url: `/listing/${pr.listing?._id || pr.listing}`,
      meta: {
        listingId: String(pr.listing?._id || pr.listing),
        pickupRequestId: String(pr._id),
        kind: 'accepted',
      },
    });

    return res.json(pr);
  } catch (err) {
    console.error('acceptRequest failed:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /api/pickup-requests/:id/counter  body: { time, location, note }
const counterRequest = async (req, res) => {
  try {
    const pr = await PickupRequest.findById(req.params.id).populate(POPULATE);
    if (!pr) return res.status(404).json({ message: 'Pickup request not found' });

    const uid = req.user._id.toString();
    const isBuyer = String(pr.buyer?._id || pr.buyer) === uid;
    const isSeller = String(pr.seller?._id || pr.seller) === uid;
    if (!isBuyer && !isSeller) return res.status(403).json({ message: 'Not authorized' });
    if (pr.status === 'accepted') return res.status(400).json({ message: 'Already accepted.' });

    const expecting = pr.awaitingFrom;
    if ((expecting === 'buyer' && !isBuyer) || (expecting === 'seller' && !isSeller)) {
      return res.status(400).json({ message: 'Not your turn to counter.' });
    }

    const when = parseTime(req.body.time);
    if (!when) return res.status(400).json({ message: 'Pick a future date and time.' });

    pr.proposals.push({
      by: req.user._id,
      byRole: isBuyer ? 'buyer' : 'seller',
      time: when,
      location: (req.body.location || '').trim(),
      note: (req.body.note || '').trim(),
      at: new Date(),
    });
    pr.awaitingFrom = isBuyer ? 'seller' : 'buyer';
    pr.status = 'pending';
    await pr.save();

    const otherUserId = isBuyer
      ? (pr.seller?._id || pr.seller)
      : (pr.buyer?._id || pr.buyer);
    await Notification.create({
      user: otherUserId,
      type: 'pickup',
      title: 'Pickup counter-proposal',
      body: `Counter-proposed ${fmtTime(when)}${req.body.location ? ` at ${req.body.location}` : ''}.`,
      url: `/listing/${pr.listing?._id || pr.listing}`,
      meta: {
        listingId: String(pr.listing?._id || pr.listing),
        pickupRequestId: String(pr._id),
        kind: 'countered',
      },
    });

    return res.json(pr);
  } catch (err) {
    console.error('counterRequest failed:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /api/pickup-requests/:id/decline — either party walks away
const declineRequest = async (req, res) => {
  try {
    const pr = await PickupRequest.findById(req.params.id);
    if (!pr) return res.status(404).json({ message: 'Pickup request not found' });
    const uid = req.user._id.toString();
    if (pr.buyer.toString() !== uid && pr.seller.toString() !== uid) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    pr.status = 'declined';
    pr.awaitingFrom = null;
    await pr.save();
    return res.json(pr);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createPickupRequest,
  getMyRequestForListing,
  listForListing,
  acceptRequest,
  counterRequest,
  declineRequest,
};
