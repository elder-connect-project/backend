const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// List drivers
router.get('/', auth, async (req, res) => {
  const drivers = await User.find({ role: 'driver' }).limit(100).lean();
  return res.json({ drivers });
});

// Update driver profile (self or admin in future)
router.put(
  '/me',
  auth,
  [
    body('firstName').optional().isString(),
    body('age').optional().isInt({ min: 16, max: 120 }),
    body('licenseNumber').optional().isString(),
    body('profileImage').optional().isString(),
    body('licenseImage').optional().isString()
  ],
  async (req, res) => {
    if (req.user.role !== 'driver') return res.status(403).json({ message: 'Only drivers can update this profile' });
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const updates = {
      firstName: req.body.firstName,
      age: req.body.age,
      licenseNumber: req.body.licenseNumber,
      profileImage: req.body.profileImage,
      licenseImage: req.body.licenseImage
    };

    const cleaned = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
    const updated = await User.findByIdAndUpdate(req.user._id, cleaned, { new: true });
    return res.json({ driver: updated });
  }
);

module.exports = router;

