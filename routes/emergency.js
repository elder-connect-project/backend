const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const EmergencyContact = require('../models/EmergencyContact');

const router = express.Router();

// List emergency contacts for an elder
router.get('/', auth, async (req, res) => {
  const { elderId } = req.query;
  if (!elderId) return res.status(400).json({ message: 'elderId is required' });
  const contacts = await EmergencyContact.find({ elderId }).sort({ priority: 1 }).lean();
  return res.json({ contacts });
});

// Create emergency contact
router.post('/', auth, [
  body('elderId').notEmpty(),
  body('name').notEmpty(),
  body('phone').notEmpty(),
  body('relation').notEmpty(),
  body('priority').optional().isInt({ min: 1 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const contact = await EmergencyContact.create(req.body);
  return res.status(201).json({ contact });
});

// Update emergency contact
router.put('/:id', auth, async (req, res) => {
  const contact = await EmergencyContact.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!contact) return res.status(404).json({ message: 'Emergency contact not found' });
  return res.json({ contact });
});

// Delete emergency contact
router.delete('/:id', auth, async (req, res) => {
  const result = await EmergencyContact.findByIdAndDelete(req.params.id);
  if (!result) return res.status(404).json({ message: 'Emergency contact not found' });
  return res.json({ message: 'Emergency contact deleted' });
});

module.exports = router;

