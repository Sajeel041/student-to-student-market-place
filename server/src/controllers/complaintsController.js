const Complaint = require('../models/Complaint');
const User = require('../models/User');

const gikiPattern = /^u\d{4}\d{3,5}@giki\.edu\.pk$/i;

// POST /api/complaints
// body: { againstEmail, againstRole, subject, description }
const createComplaint = async (req, res) => {
  try {
    const againstEmail = (req.body.againstEmail || '').toString().trim().toLowerCase();
    const againstRole = (req.body.againstRole || '').toString().trim();
    const subject = (req.body.subject || '').toString().trim();
    const description = (req.body.description || '').toString().trim();

    if (!againstEmail || !gikiPattern.test(againstEmail)) {
      return res.status(400).json({ message: 'Valid @giki.edu.pk email required for the reported user.' });
    }
    if (!['buyer', 'seller'].includes(againstRole)) {
      return res.status(400).json({ message: 'againstRole must be buyer or seller.' });
    }
    if (subject.length < 3) return res.status(400).json({ message: 'Subject is too short.' });
    if (subject.length > 120) return res.status(400).json({ message: 'Subject is too long.' });
    if (description.length < 10) return res.status(400).json({ message: 'Description is too short.' });
    if (description.length > 3000) return res.status(400).json({ message: 'Description is too long.' });

    const againstUser = await User.findOne({ email: againstEmail }).select('_id email name role');
    if (!againstUser) return res.status(404).json({ message: 'User not found for that email.' });

    if (againstUser._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot file a complaint against yourself.' });
    }

    const c = await Complaint.create({
      complainant: req.user._id,
      againstUser: againstUser._id,
      againstRole,
      subject,
      description,
    });

    await c.populate([
      { path: 'complainant', select: 'name email' },
      { path: 'againstUser', select: 'name email' },
    ]);

    return res.status(201).json(c);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/complaints/mine
const listMyComplaints = async (req, res) => {
  try {
    const rows = await Complaint.find({ complainant: req.user._id })
      .sort({ createdAt: -1 })
      .populate('againstUser', 'name email')
      .lean();
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { createComplaint, listMyComplaints };

