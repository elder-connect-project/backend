const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const { requireRoles } = require('../middleware/roleAuth');
const Schedule = require('../models/Schedule');
const FamilyMember = require('../models/FamilyMember');

const router = express.Router();

/**
 * @swagger
 * /api/schedules:
 *   get:
 *     summary: List schedules with optional filters
 *     tags:
 *       - Schedules
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: elderId
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter schedules by elder ID
 *       - in: query
 *         name: familyId
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter schedules by family ID
 *     responses:
 *       200:
 *         description: List of schedules
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 schedules:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Schedule'
 */
router.get('/', auth, requireRoles(['elder', 'family', 'driver']), async (req, res) => {
  const { elderId, familyId } = req.query;
  const filter = {};
  
  if (req.user.role === 'elder') {
    filter.elderId = req.user._id.toString();
  } else if (req.user.role === 'family') {
    const orFilters = [];

    if (familyId) {
      orFilters.push({ familyId });
    } else {
      orFilters.push({ familyId: req.user._id.toString() });
    }

    let linkedElderIds = [];
    try {
      const linkedMembers = await FamilyMember.find({
        linkedUserId: req.user._id.toString(),
      }).lean();
      linkedElderIds = linkedMembers.map((member) =>
        member.elderId?.toString()
      ).filter(Boolean);
    } catch (error) {
      console.error('Error loading linked elders:', error);
    }

    if (elderId) {
      linkedElderIds = [elderId];
    }

    if (linkedElderIds.length > 0) {
      orFilters.push({ elderId: { $in: linkedElderIds } });
    }

    if (orFilters.length === 1) {
      Object.assign(filter, orFilters[0]);
    } else {
      filter.$or = orFilters;
    }
  } else if (req.user.role === 'driver') {
    if (elderId) filter.elderId = elderId;
    if (familyId) filter.familyId = familyId;
  }
  
  const schedules = await Schedule.find(filter).limit(100).lean();
  return res.json({ schedules });
});

/**
 * @swagger
 * /api/schedules:
 *   post:
 *     summary: Create a new schedule
 *     tags:
 *       - Schedules
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
 *               - familyId
 *               - title
 *               - date
 *               - time
 *               - fromLocation
 *               - toLocation
 *             properties:
 *               elderId:
 *                 type: string
 *               familyId:
 *                 type: string
 *               title:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               time:
 *                 type: string
 *                 format: time
 *               fromLocation:
 *                 type: string
 *               toLocation:
 *                 type: string
 *     responses:
 *       201:
 *         description: Schedule created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Schedule'
 *       400:
 *         description: Validation error
 */
router.post('/', auth, requireRoles(['elder', 'family']), [
  body('elderId').notEmpty(),
  body('familyId').notEmpty(),
  body('title').notEmpty(),
  body('date').notEmpty(),
  body('time').notEmpty(),
  body('fromLocation').notEmpty(),
  body('toLocation').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  
  // If user is elder, they can only create schedules for themselves
  if (req.user.role === 'elder' && req.body.elderId !== req.user._id.toString()) {
    return res.status(403).json({ 
      message: 'Forbidden',
      error: 'Elders can only create schedules for themselves'
    });
  }
  
  // If user is family member, they should be the familyId or have permission
  if (req.user.role === 'family' && req.body.familyId !== req.user._id.toString()) {
    // Allow if they're creating for an elder they're related to (you can add more validation here)
    // For now, allow family members to create schedules
  }
  
  const schedule = await Schedule.create(req.body);
  return res.status(201).json({ schedule });
});

module.exports = router;

/**
 * @swagger
 * components:
 *   schemas:
 *     Schedule:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         elderId:
 *           type: string
 *         familyId:
 *           type: string
 *         title:
 *           type: string
 *         date:
 *           type: string
 *           format: date
 *         time:
 *           type: string
 *           format: time
 *         fromLocation:
 *           type: string
 *         toLocation:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
