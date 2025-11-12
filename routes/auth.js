const express = require("express");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const Otp = require("../models/Otp");
const { sendSms } = require("../middleware/smsClient");
const auth = require("../middleware/auth");

const router = express.Router();

const signAccessToken = (id) =>
  jwt.sign({ sub: id }, process.env.JWT_SECRET || "dev_secret", {
    expiresIn: "7d",
  });
const signRefreshToken = (id) =>
  jwt.sign(
    { sub: id, type: "refresh" },
    process.env.JWT_REFRESH_SECRET || "dev_refresh",
    { expiresIn: "30d" }
  );

/**
 * @swagger
 * /api/auth/send-otp:
 *   post:
 *     summary: Send OTP to user
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNumber
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 example: "+1234567890"
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 devOTP:
 *                   type: string
 */
router.post("/send-otp", [body("phoneNumber").notEmpty()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });
  
  const { phoneNumber } = req.body;
  
  // Validate phone number format
  if (!phoneNumber || !phoneNumber.startsWith('+')) {
    return res.status(400).json({ 
      message: 'Invalid phone number format. Must include country code (e.g., +94XXXXXXXXX)' 
    });
  }

  // Create or find user
  let user = await User.findOne({ phoneNumber });
  if (!user) {
    user = await User.create({ phoneNumber, firstName: "User" });
  }

  // Generate OTP
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + (parseInt(process.env.OTP_TTL_MS) || 5 * 60 * 1000));

  // Save OTP to database
  await Otp.findOneAndUpdate(
    { phoneNumber },
    { code, expiresAt, attempts: 0 },
    { upsert: true, new: true }
  );

  // Send OTP via SMS
  const message = `Your OTP code is ${code}. It expires in 5 minutes.`;
  
  try {
    await sendSms({ to: phoneNumber, message });
    
    // In development, return OTP for testing. In production, don't expose it.
    const response = { message: "OTP sent successfully" };
    if (process.env.NODE_ENV === 'development') {
      response.devOTP = code;
    }
    
    return res.json(response);
  } catch (smsError) {
    console.error('[OTP SEND ERROR]', smsError.message);
    // Still return success to user (security: don't reveal if OTP exists)
    // But log the error for debugging
    return res.status(500).json({ 
      message: 'Failed to send OTP. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? smsError.message : undefined
    });
  }
});

/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     summary: Verify OTP and login user
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNumber
 *               - otp
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 example: "+1234567890"
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: OTP verified, returns access and refresh tokens
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *                 user:
 *                   type: object
 *       400:
 *         description: Invalid OTP or validation error
 */
router.post(
  "/verify-otp",
  [body("phoneNumber").notEmpty(), body("otp").notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });
    
    const { phoneNumber, otp } = req.body;
    
    // Find OTP record
    const otpRecord = await Otp.findOne({ phoneNumber });
    if (!otpRecord) {
      return res.status(400).json({ message: 'OTP not found. Please request a new OTP.' });
    }
    
    // Check if OTP is expired
    if (otpRecord.expiresAt < new Date()) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ message: 'OTP expired. Please request a new OTP.' });
    }
    
    // Verify OTP code
    if (otpRecord.code !== otp) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      
      // Optional: Delete OTP after too many failed attempts
      const maxAttempts = parseInt(process.env.OTP_MAX_ATTEMPTS) || 5;
      if (otpRecord.attempts >= maxAttempts) {
        await Otp.deleteOne({ _id: otpRecord._id });
        return res.status(400).json({ 
          message: 'Too many failed attempts. Please request a new OTP.' 
        });
      }
      
      return res.status(400).json({ 
        message: 'Invalid OTP',
        attemptsRemaining: maxAttempts - otpRecord.attempts
      });
    }
    
    // OTP is valid - delete it
    await Otp.deleteOne({ _id: otpRecord._id });
    
    // Update or create user
    let user = await User.findOne({ phoneNumber });
    if (!user) {
      user = await User.create({ phoneNumber, isVerified: true, firstName: 'User' });
    } else if (!user.isVerified) {
      user.isVerified = true;
      await user.save();
    }
    
    // Generate tokens
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

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token using refresh token
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: New access token generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post(
  "/refresh",
  [body("refreshToken").notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { refreshToken } = req.body;

    try {
      // Verify refresh token
      const payload = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || "dev_refresh"
      );

      // Check if it's actually a refresh token
      if (payload.type !== "refresh") {
        return res.status(401).json({ 
          message: "Invalid token type",
          error: "Not a refresh token"
        });
      }

      // Find user and verify refresh token matches stored one
      const user = await User.findById(payload.sub);
      if (!user) {
        return res.status(401).json({ 
          message: "User not found",
          error: "Invalid refresh token"
        });
      }

      if (user.refreshToken !== refreshToken) {
        return res.status(401).json({ 
          message: "Invalid refresh token",
          error: "Refresh token does not match stored token"
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({ 
          message: "Account inactive",
          error: "User account is deactivated"
        });
      }

      // Generate new tokens
      const newRefreshToken = signRefreshToken(user._id);
      await User.findByIdAndUpdate(user._id, { refreshToken: newRefreshToken });
      const newAccessToken = signAccessToken(user._id);

      return res.json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: {
          _id: user._id,
          phoneNumber: user.phoneNumber,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isVerified: user.isVerified,
        },
      });
    } catch (e) {
      if (e.name === "TokenExpiredError") {
        return res.status(401).json({ 
          message: "Refresh token expired",
          error: "Please login again"
        });
      }
      if (e.name === "JsonWebTokenError") {
        return res.status(401).json({ 
          message: "Invalid refresh token",
          error: "Token is malformed or invalid"
        });
      }
      console.error("[REFRESH TOKEN ERROR]", e);
      return res.status(401).json({ 
        message: "Unauthorized",
        error: process.env.NODE_ENV === "development" ? e.message : undefined
      });
    }
  }
);

/**
 * @swagger
 * /api/auth/verify:
 *   get:
 *     summary: Verify if current access token is valid
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                 user:
 *                   type: object
 *       401:
 *         description: Token is invalid or expired
 */
router.get("/verify", auth, async (req, res) => {
  return res.json({
    valid: true,
    user: {
      _id: req.user._id,
      phoneNumber: req.user.phoneNumber,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      role: req.user.role,
      isVerified: req.user.isVerified,
    },
  });
});

module.exports = router;
