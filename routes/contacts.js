const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Contact = require('../models/Contact');

const router = express.Router();

// List my contacts
router.get('/', auth, async (req, res) => {
  const contacts = await Contact.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean();
  return res.json({ contacts });
});

// Create contact
router.post('/', auth, [
  body('name').notEmpty(),
  body('phone').notEmpty(),
  body('relation').optional().isString(),
  body('isEmergency').optional().isBoolean()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const contact = await Contact.create({ ...req.body, userId: req.user._id });
  return res.status(201).json({ contact });
});

// Update contact
router.put('/:id', auth, async (req, res) => {
  const contact = await Contact.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, req.body, { new: true });
  if (!contact) return res.status(404).json({ message: 'Contact not found' });
  return res.json({ contact });
});

// Delete contact
router.delete('/:id', auth, async (req, res) => {
  const result = await Contact.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!result) return res.status(404).json({ message: 'Contact not found' });
  return res.json({ message: 'Contact deleted' });
});

module.exports = router;

