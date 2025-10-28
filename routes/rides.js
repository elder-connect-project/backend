const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Ride = require('../models/Ride');

const router = express.Router();

/**
 * @swagger
 * /api/rides:
 *   get:
 *     summary: List rides with optional filters
 *     tags:
 *       - Rides
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: elderId
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter rides by elder ID
 *       - in: query
 *         name: driverId
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter rides by driver ID
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter rides by status
 *     responses:
 *       200:
 *         description: List of rides
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rides:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Ride'
 */
router.get('/', auth, async (req, res) => {
  const { elderId, driverId, status } = req.query;
  const filter = {};
  if (elderId) filter.elderId = elderId;
  if (driverId) filter.driverId = driverId;
  if (status) filter.status = status;
  const rides = await Ride.find(filter).limit(100).lean();
  return res.json({ rides });
});

/**
 * @swagger
 * /api/rides:
 *   post:
 *     summary: Create a new ride
 *     tags:
 *       - Rides
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - scheduleId
 *               - elderId
 *               - driverId
 *               - familyId
 *               - pickupLocation
 *               - dropLocation
 *               - scheduledTime
 *             properties:
 *               scheduleId:
 *                 type: string
 *               elderId:
 *                 type: string
 *               driverId:
 *                 type: string
 *               familyId:
 *                 type: string
 *               pickupLocation:
 *                 type: string
 *               dropLocation:
 *                 type: string
 *               scheduledTime:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Ride created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ride'
 *       400:
 *         description: Validation error
 */
router.post('/', auth, [
  body('scheduleId').notEmpty(),
  body('elderId').notEmpty(),
  body('driverId').notEmpty(),
  body('familyId').notEmpty(),
  body('pickupLocation').notEmpty(),
  body('dropLocation').notEmpty(),
  body('scheduledTime').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const ride = await Ride.create(req.body);
  return res.status(201).json({ ride });
});

module.exports = router;

/**
 * @swagger
 * components:
 *   schemas:
 *     Ride:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         scheduleId:
 *           type: string
 *         elderId:
 *           type: string
 *         driverId:
 *           type: string
 *         familyId:
 *           type: string
 *         pickupLocation:
 *           type: string
 *         dropLocation:
 *           type: string
 *         scheduledTime:
 *           type: string
 *           format: date-time
 *         status:
 *           type: string
 *           description: Ride status (e.g., pending, completed, cancelled)
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
