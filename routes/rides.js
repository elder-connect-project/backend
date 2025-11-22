const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const { requireRoles, requireRole } = require('../middleware/roleAuth');
const Ride = require('../models/Ride');
const Schedule = require('../models/Schedule');

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
router.get('/', auth, requireRoles(['elder', 'family', 'driver']), async (req, res) => {
  const { elderId, driverId, status } = req.query;
  const filter = {};
  
  // Role-based filtering
  if (req.user.role === 'elder') {
    // Elders can only see their own rides
    filter.elderId = req.user._id.toString();
  } else if (req.user.role === 'family') {
    // Family members can see rides for elders they're related to
    if (elderId) {
      filter.elderId = elderId;
    } else {
      // Show rides where this user is the family member
      filter.familyId = req.user._id.toString();
    }
  } else if (req.user.role === 'driver') {
    // Drivers can see their own rides or all rides if no filter
    if (driverId) {
      filter.driverId = driverId;
    } else {
      // Show driver's own rides
      filter.driverId = req.user._id.toString();
    }
  }
  
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
router.post('/', auth, requireRoles(['elder', 'family']), [
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
  
  // If user is elder, they can only create rides for themselves
  if (req.user.role === 'elder' && req.body.elderId !== req.user._id.toString()) {
    return res.status(403).json({ 
      message: 'Forbidden',
      error: 'Elders can only create rides for themselves'
    });
  }
  
  // If user is family member, they should be the familyId
  if (req.user.role === 'family' && req.body.familyId !== req.user._id.toString()) {
    return res.status(403).json({ 
      message: 'Forbidden',
      error: 'Family members can only create rides where they are the family member'
    });
  }
  
  const ride = await Ride.create(req.body);
  return res.status(201).json({ ride });
});

/**
 * @swagger
 * /api/rides/{id}/accept:
 *   put:
 *     summary: Accept a ride (driver only)
 *     tags:
 *       - Rides
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Ride ID
 *     responses:
 *       200:
 *         description: Ride accepted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ride'
 *       403:
 *         description: Forbidden - Only drivers can accept rides assigned to them
 *       404:
 *         description: Ride not found
 *       400:
 *         description: Ride cannot be accepted (already accepted/cancelled)
 */
router.put('/:id/accept', auth, requireRole('driver'), async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    
    if (!ride) {
      return res.status(404).json({ 
        message: 'Ride not found',
        error: 'The ride you are trying to accept does not exist'
      });
    }

    // Check if the ride is assigned to this driver
    if (ride.driverId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        message: 'Forbidden',
        error: 'You can only accept rides assigned to you'
      });
    }

    // Check if ride can be accepted (must be pending)
    if (ride.status !== 'pending') {
      return res.status(400).json({ 
        message: 'Bad Request',
        error: `Ride cannot be accepted. Current status: ${ride.status}`
      });
    }

    // Update ride status to accepted
    ride.status = 'accepted';
    await ride.save();

    // Update schedule status to confirmed when ride is accepted
    try {
      await Schedule.findByIdAndUpdate(ride.scheduleId, {
        status: 'confirmed'
      });
    } catch (scheduleError) {
      console.error('Error updating schedule status:', scheduleError);
    }

    return res.json({ 
      message: 'Ride accepted successfully',
      ride,
      notifyFamily: true,
      notificationMessage: `Driver ${req.user.firstName || 'Driver'} has accepted your ride request for ${ride.pickupLocation} to ${ride.dropLocation}.`
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        message: 'Invalid ride ID',
        error: 'The provided ride ID is not valid'
      });
    }
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

/**
 * @swagger
 * /api/rides/{id}/decline:
 *   put:
 *     summary: Decline a ride (driver only)
 *     tags:
 *       - Rides
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Ride ID
 *     responses:
 *       200:
 *         description: Ride declined successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ride'
 *       403:
 *         description: Forbidden - Only drivers can decline rides assigned to them
 *       404:
 *         description: Ride not found
 *       400:
 *         description: Ride cannot be declined (already completed/cancelled)
 */
router.put('/:id/decline', auth, requireRole('driver'), async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    
    if (!ride) {
      return res.status(404).json({ 
        message: 'Ride not found',
        error: 'The ride you are trying to decline does not exist'
      });
    }

    // Check if the ride is assigned to this driver
    if (ride.driverId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        message: 'Forbidden',
        error: 'You can only decline rides assigned to you'
      });
    }

    // Check if ride can be declined (must be pending or accepted)
    if (ride.status === 'completed') {
      return res.status(400).json({ 
        message: 'Bad Request',
        error: 'Cannot decline a completed ride'
      });
    }

    if (ride.status === 'cancelled') {
      return res.status(400).json({ 
        message: 'Bad Request',
        error: 'Ride is already cancelled'
      });
    }

    // Update ride status to cancelled
    ride.status = 'cancelled';
    await ride.save();

    // Update schedule: set status back to pending and clear driver info so family can select another driver
    try {
      await Schedule.findByIdAndUpdate(ride.scheduleId, {
        status: 'pending',
        driverId: null,
        driverName: null,
        driverPhone: null
      });
    } catch (scheduleError) {
      console.error('Error updating schedule status:', scheduleError);
    }

    return res.json({ 
      message: 'Ride declined successfully',
      ride,
      notifyFamily: true,
      notificationMessage: `Driver ${req.user.firstName || 'Driver'} has declined your ride request for ${ride.pickupLocation} to ${ride.dropLocation}. Please select another driver.`
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        message: 'Invalid ride ID',
        error: 'The provided ride ID is not valid'
      });
    }
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

/**
 * @swagger
 * /api/rides/{id}/pickup:
 *   put:
 *     summary: Confirm pickup for a ride
 *     tags:
 *       - Rides
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Ride ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Pickup confirmed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ride'
 *       403:
 *         description: Forbidden - Only drivers can confirm pickup
 *       404:
 *         description: Ride not found
 *       400:
 *         description: Ride cannot be confirmed (wrong status)
 */
router.put('/:id/pickup', auth, requireRole('driver'), async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    
    if (!ride) {
      return res.status(404).json({ 
        message: 'Ride not found',
        error: 'The ride you are trying to confirm pickup for does not exist'
      });
    }

    // Check if the ride is assigned to this driver
    if (ride.driverId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        message: 'Forbidden',
        error: 'You can only confirm pickup for rides assigned to you'
      });
    }

    // Check if ride can be confirmed (must be accepted)
    if (ride.status !== 'accepted') {
      return res.status(400).json({ 
        message: 'Bad Request',
        error: `Cannot confirm pickup. Ride status must be 'accepted'. Current status: ${ride.status}`
      });
    }

    // Update ride status to in_progress
    ride.status = 'in_progress';
    await ride.save();

    // Update schedule status if needed
    try {
      await Schedule.findByIdAndUpdate(ride.scheduleId, {
        status: 'confirmed'
      });
    } catch (scheduleError) {
      console.error('Error updating schedule status:', scheduleError);
    }

    return res.json({ 
      message: 'Pickup confirmed successfully',
      ride,
      notifyElder: true,
      notifyFamily: true,
      notificationMessage: `Driver ${req.user.firstName || 'Driver'} has confirmed pickup. You can now track the ride.`
    });
  } catch (error) {
    console.error('Error confirming pickup:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        message: 'Invalid ride ID',
        error: 'The provided ride ID is not valid'
      });
    }
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
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
