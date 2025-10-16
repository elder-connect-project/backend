const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Location = require('../models/Location');

const router = express.Router();

// POST /api/location - save current user location
router.post('/', auth, [
  body('latitude').isFloat({ min: -90, max: 90 }),
  body('longitude').isFloat({ min: -180, max: 180 }),
  body('accuracy').optional().isFloat({ min: 0 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { latitude, longitude, accuracy, address } = req.body;
  const doc = await Location.create({
    userId: req.user._id,
    role: req.user.role,
    coords: { type: 'Point', coordinates: [longitude, latitude] },
    accuracy,
    address
  });
  return res.status(201).json({ location: doc });
});

// GET /api/location/me - latest location for current user
router.get('/me', auth, async (req, res) => {
  const latest = await Location.findOne({ userId: req.user._id }).sort({ createdAt: -1 }).lean();
  return res.json({ location: latest });
});

// GET /api/location/user/:id - latest location by user id
router.get('/user/:id', auth, async (req, res) => {
  const latest = await Location.findOne({ userId: req.params.id }).sort({ createdAt: -1 }).lean();
  return res.json({ location: latest });
});

// GET /api/location/nearby?lat=&lng=&radiusKm=&role=driver
router.get('/nearby', auth, async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const radiusKm = parseFloat(req.query.radiusKm || '5');
  const role = req.query.role;
  if (Number.isNaN(lat) || Number.isNaN(lng)) return res.status(400).json({ message: 'lat and lng are required' });

  const meters = radiusKm * 1000;
  const filter = {
    coords: {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: meters
      }
    }
  };
  if (role) filter.role = role;

  const results = await Location.find(filter).limit(50).lean();
  return res.json({ results });
});

module.exports = router;

