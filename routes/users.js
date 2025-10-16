const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

router.get('/me', auth, async (req, res) => {
  return res.json({ user: req.user });
});

router.get('/', auth, async (req, res) => {
  const { role } = req.query;
  const filter = {};
  if (role) filter.role = role;
  const users = await User.find(filter).limit(100).lean();
  return res.json({ users });
});

router.get('/:id', auth, async (req, res) => {
  const user = await User.findById(req.params.id).lean();
  return res.json({ user });
});

router.put('/:id', auth, async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
  return res.json({ user });
});

router.delete('/:id', auth, async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  return res.json({ message: 'User deleted successfully' });
});

router.post('/', auth, async (req, res) => {

  const {age, address, firstName, lastName, phoneNumber, role} = req.body;
  if(!age || !address || !firstName || !lastName || !phoneNumber || !role) return res.status(400).json({ message: 'All fields are required' });
  if(role !== 'elder' && role !== 'family' && role !== 'driver') return res.status(400).json({ message: 'Invalid role' });
  if(role == 'driver' && !licenseNumber) return res.status(400).json({ message: 'License number is required' });
  if(role == 'driver' && !licenseImage) return res.status(400).json({ message: 'License image is required' });
  if(role == 'driver' && !isAvailable) return res.status(400).json({ message: 'Availability is required' });
  if(role == 'driver' && !profileImage) return res.status(400).json({ message: 'Profile image is required' });
  if(phoneNumber.length !== 10) return res.status(400).json({ message: 'Invalid phone number' });
  if(age < 18) return res.status(400).json({ message: 'Age must be greater than 18' });
  if(role == 'elder' && age < 60) return res.status(400).json({ message: 'Age must be greater than 60' });
  const user = await User.create({age, address, firstName, lastName, phoneNumber, role});
  return res.json({ user });
});

module.exports = router;
