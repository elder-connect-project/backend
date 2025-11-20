const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const { requireRoles } = require('../middleware/roleAuth');
const FamilyMember = require('../models/FamilyMember');
const User = require('../models/User');

const router = express.Router();

/**
 * @swagger
 * /api/family:
 *   get:
 *     summary: List family members
 *     tags:
 *       - Family
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: elderId
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter by elder ID
 *     responses:
 *       200:
 *         description: List of family members
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 members:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/FamilyMember'
 */
router.get('/', auth, requireRoles(['elder', 'family']), async (req, res) => {
  const { elderId, linked } = req.query;
  const filter = {};

  if (req.user.role === 'elder') {
    filter.elderId = req.user._id.toString();
  } else if (req.user.role === 'family') {
    if (linked === 'me') {
      filter.linkedUserId = req.user._id.toString();
    } else if (elderId) {
      filter.elderId = elderId;
    } else {
      filter.$or = [
        { addedBy: req.user._id.toString() },
        { linkedUserId: req.user._id.toString() },
      ];
    }
  }

  // Keep linkedUserId up to date when phone matches current user
  if (req.user.role === 'family' && req.user.phoneNumber) {
    await FamilyMember.updateMany(
      {
        phone: req.user.phoneNumber,
        $or: [
          { linkedUserId: { $exists: false } },
          { linkedUserId: null },
        ],
      },
      { linkedUserId: req.user._id.toString() }
    );
  }

  const members = await FamilyMember.find(filter)
    .limit(100)
    .populate('elderId', 'firstName lastName phoneNumber')
    .lean();
  return res.json({ members });
});

/**
 * @swagger
 * /api/family:
 *   post:
 *     summary: Add a new family member
 *     tags:
 *       - Family
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - elderId
 *               - name
 *               - phone
 *               - relation
 *             properties:
 *               elderId:
 *                 type: string
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               relation:
 *                 type: string
 *     responses:
 *       201:
 *         description: Family member created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FamilyMember'
 *       400:
 *         description: Validation error
 */
router.post('/', auth, requireRoles(['elder', 'family']), [
  body('elderId').notEmpty(),
  body('name').notEmpty(),
  body('phone').notEmpty(),
  body('relation').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  
  // If user is elder, they can only add family members for themselves
  if (req.user.role === 'elder' && req.body.elderId !== req.user._id.toString()) {
    return res.status(403).json({ 
      message: 'Forbidden',
      error: 'Elders can only add family members for themselves'
    });
  }
  
  const normalizedPhone = req.body.phone.trim();
  const member = await FamilyMember.create({
    ...req.body,
    phone: normalizedPhone,
    addedBy: req.user._id,
  });

  const linkedUser = await User.findOne({ phoneNumber: normalizedPhone }).lean();
  if (linkedUser) {
    member.linkedUserId = linkedUser._id;
    await member.save();
  }

  return res.status(201).json({ member });
});

module.exports = router;

/**
 * @swagger
 * components:
 *   schemas:
 *     FamilyMember:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         elderId:
 *           type: string
 *         name:
 *           type: string
 *         phone:
 *           type: string
 *         relation:
 *           type: string
 *         addedBy:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

