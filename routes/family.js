const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const FamilyMember = require('../models/FamilyMember');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  const { elderId } = req.query;
  const filter = {};
  if (elderId) filter.elderId = elderId;
  const members = await FamilyMember.find(filter).limit(100).lean();
  return res.json({ members });
});

router.post('/', auth, [
  body('elderId').notEmpty(),
  body('name').notEmpty(),
  body('phone').notEmpty(),
  body('relation').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const member = await FamilyMember.create({ ...req.body, addedBy: req.user._id });
  return res.status(201).json({ member });
});

module.exports = router;

