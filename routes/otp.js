const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const Otp = require('../models/Otp');
const User = require('../models/User');
const apiKeyAuth = require('../middleware/apiKeyAuth');
const { sendSms } = require('../middleware/smsClient');

const router = express.Router();

function generateOtp() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function signAccessToken(id) {
  return jwt.sign({ sub: id }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '7d' });
}

function signRefreshToken(id) {
  return jwt.sign({ sub: id, type: 'refresh' }, process.env.JWT_REFRESH_SECRET || 'dev_refresh', { expiresIn: '30d' });
}

/**
 * @swagger
 * /api/otp/send:
 *   post:
 *     summary: Send OTP via SMS
 *     tags:
 *       - OTP
 *     parameters:
 *       - in: header
 *         name: x-api-key
 *         schema:
 *           type: string
 *         required: true
 *       - in: header
 *         name: x-user-id
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phoneNumber]
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 example: "+9477XXXXXXX"
 *     responses:
 *       200:
 *         description: OTP sent
 */
router.post(
  '/send',
  apiKeyAuth,
  [body('phoneNumber').notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { phoneNumber } = req.body;
    const code = generateOtp();
    const expiresAt = new Date(Date.now() + (parseInt(process.env.OTP_TTL_MS) || 5 * 60 * 1000));

    await Otp.findOneAndUpdate(
      { phoneNumber },
      { code, expiresAt, attempts: 0 },
      { upsert: true, new: true }
    );

    const message = `Your OTP code is ${code}. It expires in 5 minutes.`;
    
    try {
      await sendSms({ to: phoneNumber, message });
      return res.json({ message: 'OTP sent successfully' });
    } catch (smsError) {
      console.error('[OTP SEND ERROR]', smsError.message);
      // Still return success to user (security: don't reveal if OTP exists)
      // But log the error for debugging
      return res.status(500).json({ 
        message: 'Failed to send OTP. Please try again later.',
        error: process.env.NODE_ENV === 'development' ? smsError.message : undefined
      });
    }
  }
);

/**
 * @swagger
 * /api/otp/verify:
 *   post:
 *     summary: Verify OTP and issue JWTs
 *     tags:
 *       - OTP
 *     parameters:
 *       - in: header
 *         name: x-api-key
 *         schema:
 *           type: string
 *         required: true
 *       - in: header
 *         name: x-user-id
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phoneNumber, code]
 *             properties:
 *               phoneNumber:
 *                 type: string
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Verified
 */
router.post(
  '/verify',
  apiKeyAuth,
  [body('phoneNumber').notEmpty(), body('code').notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { phoneNumber, code } = req.body;
    const record = await Otp.findOne({ phoneNumber });
    if (!record) return res.status(400).json({ message: 'OTP not found' });
    if (record.expiresAt < new Date()) return res.status(400).json({ message: 'OTP expired' });
    if (record.code !== code) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    await Otp.deleteOne({ _id: record._id });

    let user = await User.findOne({ phoneNumber });
    if (!user) {
      user = await User.create({ phoneNumber, isVerified: true, firstName: 'User' });
    } else if (!user.isVerified) {
      user.isVerified = true;
      await user.save();
    }

    const refreshToken = signRefreshToken(user._id);
    await User.findByIdAndUpdate(user._id, { refreshToken });
    const accessToken = signAccessToken(user._id);

    // Return user with all fields including role
    const userResponse = {
      _id: user._id,
      phoneNumber: user.phoneNumber,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isVerified: user.isVerified,
      isActive: user.isActive,
      age: user.age,
      address: user.address,
      profileImage: user.profileImage,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    return res.json({ accessToken, refreshToken, user: userResponse });
  }
);

module.exports = router;


