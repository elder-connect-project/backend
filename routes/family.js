const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
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
router.get('/', auth, async (req, res) => {
  const { elderId } = req.query;
  const filter = {};
  if (elderId) filter.elderId = elderId;
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
router.post('/', auth, [
  body('elderId').notEmpty(),
  body('name').notEmpty(),
  body('phone').notEmpty(),
  body('relation').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
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
