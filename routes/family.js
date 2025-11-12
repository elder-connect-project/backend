const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const { requireRoles } = require('../middleware/roleAuth');
const FamilyMember = require('../models/FamilyMember');

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
  const { elderId } = req.query;
  const filter = {};
  
  // If user is elder, only show their own family members
  // If user is family member, show family members they added or related to their elder
  if (req.user.role === 'elder') {
    filter.elderId = req.user._id.toString();
  } else if (req.user.role === 'family') {
    // Family members can see members they added or filter by elderId if provided
    if (elderId) {
      filter.elderId = elderId;
    } else {
      // Show family members added by this user
      filter.addedBy = req.user._id.toString();
    }
  }
  
  const members = await FamilyMember.find(filter).limit(100).lean();
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
  
  const member = await FamilyMember.create({ ...req.body, addedBy: req.user._id });
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
