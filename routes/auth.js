const express = require("express");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");

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
  try {
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

    // Generate 4-digit OTP (matching frontend)
    const devOTP = Math.floor(1000 + Math.random() * 9000).toString();
    
    return res.json({ 
      message: "OTP sent successfully", 
      devOTP,
      success: true
    });
  } catch (error) {
    console.error('[SEND OTP ERROR]', error);
    return res.status(500).json({ message: 'Failed to send OTP', error: error.message });
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
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });
      
      const { phoneNumber, otp } = req.body;
      
      // Find user
      let user = await User.findOne({ phoneNumber });
      if (!user) {
        return res.status(400).json({ message: "User not found. Please request OTP first." });
      }

      // For now, accept any 4-digit OTP (in production, verify against stored OTP)
      if (!otp || otp.length !== 4 || !/^\d{4}$/.test(otp)) {
        return res.status(400).json({ message: "Invalid OTP format. Must be 4 digits." });
      }

      // Update user as verified
      user = await User.findOneAndUpdate(
        { phoneNumber },
        { isVerified: true },
        { new: true }
      );

      // Generate tokens
      const refreshToken = signRefreshToken(user._id);
      await User.findByIdAndUpdate(user._id, { refreshToken });
      const accessToken = signAccessToken(user._id);

      // Return user with all fields
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
        licenseNumber: user.licenseNumber,
        licenseImage: user.licenseImage,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };

      return res.json({ accessToken, refreshToken, user: userResponse });
    } catch (error) {
      console.error('[VERIFY OTP ERROR]', error);
      return res.status(500).json({ message: 'Failed to verify OTP', error: error.message });
    }
  }
);

module.exports = router;
