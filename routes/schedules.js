const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Schedule = require('../models/Schedule');

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
router.get('/', auth, async (req, res) => {
  const { elderId, familyId } = req.query;
  const filter = {};
  if (elderId) filter.elderId = elderId;
  if (familyId) filter.familyId = familyId;
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
router.post('/', auth, [
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
