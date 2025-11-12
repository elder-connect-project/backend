const express = require("express");
const { body, validationResult } = require("express-validator");
const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/roleAuth");
const User = require("../models/User");

const router = express.Router();

/**
 * @swagger
 * /api/drivers:
 *   get:
 *     summary: List all drivers
 *     tags:
 *       - Drivers
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of drivers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 drivers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Driver'
 */
router.get("/", auth, async (req, res) => {
  const drivers = await User.find({ role: "driver" }).limit(100).lean();
  return res.json({ drivers });
});

/**
 * @swagger
 * /api/drivers/me:
 *   put:
 *     summary: Update driver profile
 *     tags:
 *       - Drivers
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               age:
 *                 type: integer
 *                 minimum: 16
 *                 maximum: 120
 *               licenseNumber:
 *                 type: string
 *               profileImage:
 *                 type: string
 *               licenseImage:
 *                 type: string
 *     responses:
 *       200:
 *         description: Driver profile updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 driver:
 *                   $ref: '#/components/schemas/Driver'
 *       400:
 *         description: Validation error
 *       403:
 *         description: Forbidden (not a driver)
 */
router.put(
  "/me",
  auth,
  requireRole("driver"),
  [
    body("firstName").optional().isString(),
    body("age").optional().isInt({ min: 16, max: 120 }),
    body("licenseNumber").optional().isString(),
    body("profileImage").optional().isString(),
    body("licenseImage").optional().isString(),
    body("isAvailable").optional().isBoolean(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const updates = {
      firstName: req.body.firstName,
      age: req.body.age,
      licenseNumber: req.body.licenseNumber,
      profileImage: req.body.profileImage,
      licenseImage: req.body.licenseImage,
      isAvailable: req.body.isAvailable,
    };

    const cleaned = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    const updated = await User.findByIdAndUpdate(req.user._id, cleaned, {
      new: true,
    });
    return res.json({ driver: updated });
  }
);

module.exports = router;

/**
 * @swagger
 * components:
 *   schemas:
 *     Driver:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         firstName:
 *           type: string
 *         age:
 *           type: integer
 *         licenseNumber:
 *           type: string
 *         profileImage:
 *           type: string
 *         licenseImage:
 *           type: string
 *         role:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
