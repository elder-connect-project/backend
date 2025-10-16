const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Schedule = require('../models/Schedule');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  const { elderId, familyId } = req.query;
  const filter = {};
  if (elderId) filter.elderId = elderId;
  if (familyId) filter.familyId = familyId;
  const schedules = await Schedule.find(filter).limit(100).lean();
  return res.json({ schedules });
});

router.post('/', auth, [
  body('elderId').notEmpty(),
  body('familyId').notEmpty(),
  body('title').notEmpty(),
  body('date').notEmpty(),
  body('time').notEmpty(),
  body('fromLocation').notEmpty(),
  body('toLocation').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const schedule = await Schedule.create(req.body);
  return res.status(201).json({ schedule });
});

module.exports = router;

