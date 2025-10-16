const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Ride = require('../models/Ride');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  const { elderId, driverId, status } = req.query;
  const filter = {};
  if (elderId) filter.elderId = elderId;
  if (driverId) filter.driverId = driverId;
  if (status) filter.status = status;
  const rides = await Ride.find(filter).limit(100).lean();
  return res.json({ rides });
});

router.post('/', auth, [
  body('scheduleId').notEmpty(),
  body('elderId').notEmpty(),
  body('driverId').notEmpty(),
  body('familyId').notEmpty(),
  body('pickupLocation').notEmpty(),
  body('dropLocation').notEmpty(),
  body('scheduledTime').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const ride = await Ride.create(req.body);
  return res.status(201).json({ ride });
});

module.exports = router;

