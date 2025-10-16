const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

const router = express.Router();

const signAccessToken = (id) => jwt.sign({ sub: id }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '7d' });
const signRefreshToken = (id) => jwt.sign({ sub: id, type: 'refresh' }, process.env.JWT_REFRESH_SECRET || 'dev_refresh', { expiresIn: '30d' });

router.post('/send-otp', [body('phoneNumber').notEmpty()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { phoneNumber } = req.body;
  let user = await User.findOne({ phoneNumber });
  if (!user) user = await User.create({ phoneNumber, firstName: 'User' });
  const devOTP = '123456';
  return res.json({ message: 'OTP sent', devOTP });
});

router.post('/verify-otp', [body('phoneNumber').notEmpty(), body('otp').notEmpty()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { phoneNumber, otp } = req.body;
  if (otp !== '123456') return res.status(400).json({ message: 'Invalid OTP' });
  const user = await User.findOneAndUpdate({ phoneNumber }, { isVerified: true }, { new: true });
  const refreshToken = signRefreshToken(user._id);
  await User.findByIdAndUpdate(user._id, { refreshToken });
  const accessToken = signAccessToken(user._id);
  return res.json({ accessToken, refreshToken, user });
});

module.exports = router;
