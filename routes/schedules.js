const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const { requireRoles } = require('../middleware/roleAuth');
const Schedule = require('../models/Schedule');
const FamilyMember = require('../models/FamilyMember');
const Ride = require('../models/Ride');

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
    // Drivers see schedules assigned to them
    filter.driverId = req.user._id.toString();
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
  
  // Validate that scheduled time is at least 30 minutes from now
  try {
    const scheduleDate = new Date(req.body.date);
    
    // Parse time format (e.g., "10:30 AM" or "14:30")
    let hour24, minutes;
    if (req.body.time.includes('AM') || req.body.time.includes('PM')) {
      // 12-hour format
      const timeMatch = req.body.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (timeMatch) {
        hour24 = parseInt(timeMatch[1]);
        minutes = parseInt(timeMatch[2]);
        const period = timeMatch[3].toUpperCase();
        if (period === 'PM' && hour24 !== 12) hour24 += 12;
        if (period === 'AM' && hour24 === 12) hour24 = 0;
      } else {
        return res.status(400).json({ 
          message: 'Invalid time format',
          error: 'Time must be in format "HH:MM AM/PM"'
        });
      }
    } else {
      // 24-hour format
      const [h, m] = req.body.time.split(':');
      hour24 = parseInt(h);
      minutes = parseInt(m);
    }
    
    scheduleDate.setHours(hour24, minutes || 0, 0, 0);
    
    // Check if scheduled time is at least 30 minutes from now
    const now = new Date();
    const minScheduledTime = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now
    
    if (scheduleDate <= now) {
      return res.status(400).json({ 
        message: 'Invalid schedule time',
        error: 'Cannot schedule at current time or in the past. Please schedule at least 30 minutes from now.'
      });
    }
    
    if (scheduleDate < minScheduledTime) {
      return res.status(400).json({ 
        message: 'Invalid schedule time',
        error: 'Please schedule at least 30 minutes from now. Minimum time: ' + minScheduledTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      });
    }
  } catch (timeError) {
    return res.status(400).json({ 
      message: 'Invalid date or time',
      error: 'Please provide a valid date and time'
    });
  }
  
  // Set status to pending - requires driver acceptance
  const scheduleData = {
    ...req.body,
    status: 'pending' // Driver must accept
  };
  
  const schedule = await Schedule.create(scheduleData);
  
  // Automatically create a ride when schedule is created with a driver
  if (schedule.driverId) {
    try {
      // Combine date and time to create scheduledTime
      const scheduleDate = new Date(schedule.date);
      
      // Parse time format (e.g., "10:30 AM" or "14:30")
      let hour24, minutes;
      if (schedule.time.includes('AM') || schedule.time.includes('PM')) {
        // 12-hour format
        const timeMatch = schedule.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (timeMatch) {
          hour24 = parseInt(timeMatch[1]);
          minutes = parseInt(timeMatch[2]);
          const period = timeMatch[3].toUpperCase();
          if (period === 'PM' && hour24 !== 12) hour24 += 12;
          if (period === 'AM' && hour24 === 12) hour24 = 0;
        } else {
          throw new Error('Invalid time format');
        }
      } else {
        // 24-hour format
        const [h, m] = schedule.time.split(':');
        hour24 = parseInt(h);
        minutes = parseInt(m);
      }
      
      scheduleDate.setHours(hour24, minutes || 0, 0, 0);
      
      const ride = await Ride.create({
        scheduleId: schedule._id,
        elderId: schedule.elderId,
        driverId: schedule.driverId,
        familyId: schedule.familyId,
        pickupLocation: schedule.fromLocation,
        dropLocation: schedule.toLocation,
        scheduledTime: scheduleDate,
        status: 'pending' // Driver must accept
      });
      
      console.log('Ride created automatically for schedule:', schedule._id, 'Ride ID:', ride._id);
    } catch (rideError) {
      console.error('Error creating ride for schedule:', rideError);
      // Don't fail schedule creation if ride creation fails, but log the error
    }
  }
  
  return res.status(201).json({ schedule });
});

/**
 * @swagger
 * /api/schedules/{id}:
 *   put:
 *     summary: Update a schedule
 *     tags:
 *       - Schedules
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Schedule ID
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               date:
 *                 type: string
 *               time:
 *                 type: string
 *               fromLocation:
 *                 type: string
 *               toLocation:
 *                 type: string
 *               driverId:
 *                 type: string
 *               driverName:
 *                 type: string
 *               driverPhone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Schedule updated
 *       404:
 *         description: Schedule not found
 */
router.put('/:id', auth, requireRoles(['elder', 'family']), [
  body('title').optional().notEmpty(),
  body('date').optional().notEmpty(),
  body('time').optional().notEmpty(),
  body('fromLocation').optional().notEmpty(),
  body('toLocation').optional().notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  
  const schedule = await Schedule.findById(req.params.id);
  if (!schedule) {
    return res.status(404).json({ message: 'Schedule not found' });
  }
  
  // Check permissions
  if (req.user.role === 'elder' && schedule.elderId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ 
      message: 'Forbidden',
      error: 'You can only update your own schedules'
    });
  }
  
  if (req.user.role === 'family' && schedule.familyId.toString() !== req.user._id.toString()) {
    // Check if user is linked to the elder
    const linkedMember = await FamilyMember.findOne({
      linkedUserId: req.user._id.toString(),
      elderId: schedule.elderId.toString()
    });
    if (!linkedMember) {
      return res.status(403).json({ 
        message: 'Forbidden',
        error: 'You can only update schedules for elders you are linked to'
      });
    }
  }
  
  // Validate that scheduled time is at least 30 minutes from now (if date or time is being updated)
  if (req.body.date !== undefined || req.body.time !== undefined) {
    try {
      const scheduleDate = new Date(req.body.date !== undefined ? req.body.date : schedule.date);
      const scheduleTime = req.body.time !== undefined ? req.body.time : schedule.time;
      
      // Parse time format (e.g., "10:30 AM" or "14:30")
      let hour24, minutes;
      if (scheduleTime.includes('AM') || scheduleTime.includes('PM')) {
        // 12-hour format
        const timeMatch = scheduleTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (timeMatch) {
          hour24 = parseInt(timeMatch[1]);
          minutes = parseInt(timeMatch[2]);
          const period = timeMatch[3].toUpperCase();
          if (period === 'PM' && hour24 !== 12) hour24 += 12;
          if (period === 'AM' && hour24 === 12) hour24 = 0;
        } else {
          return res.status(400).json({ 
            message: 'Invalid time format',
            error: 'Time must be in format "HH:MM AM/PM"'
          });
        }
      } else {
        // 24-hour format
        const [h, m] = scheduleTime.split(':');
        hour24 = parseInt(h);
        minutes = parseInt(m);
      }
      
      scheduleDate.setHours(hour24, minutes || 0, 0, 0);
      
      // Check if scheduled time is at least 30 minutes from now
      const now = new Date();
      const minScheduledTime = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now
      
      if (scheduleDate <= now) {
        return res.status(400).json({ 
          message: 'Invalid schedule time',
          error: 'Cannot schedule at current time or in the past. Please schedule at least 30 minutes from now.'
        });
      }
      
      if (scheduleDate < minScheduledTime) {
        return res.status(400).json({ 
          message: 'Invalid schedule time',
          error: 'Please schedule at least 30 minutes from now. Minimum time: ' + minScheduledTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
        });
      }
    } catch (timeError) {
      return res.status(400).json({ 
        message: 'Invalid date or time',
        error: 'Please provide a valid date and time'
      });
    }
  }
  
  // Update schedule
  const updateData = {};
  const oldDriverId = schedule.driverId?.toString();
  const newDriverId = req.body.driverId?.toString();
  const driverChanged = oldDriverId && newDriverId && oldDriverId !== newDriverId;
  const driverRemoved = oldDriverId && !newDriverId;
  const newDriverAdded = !oldDriverId && newDriverId;
  
  if (req.body.title !== undefined) updateData.title = req.body.title;
  if (req.body.date !== undefined) {
    // Convert date string to Date object if needed
    updateData.date = req.body.date instanceof Date ? req.body.date : new Date(req.body.date);
  }
  if (req.body.time !== undefined) updateData.time = req.body.time;
  if (req.body.fromLocation !== undefined) updateData.fromLocation = req.body.fromLocation;
  if (req.body.toLocation !== undefined) updateData.toLocation = req.body.toLocation;
  if (req.body.driverId !== undefined) updateData.driverId = req.body.driverId;
  if (req.body.driverName !== undefined) updateData.driverName = req.body.driverName;
  if (req.body.driverPhone !== undefined) updateData.driverPhone = req.body.driverPhone;
  
  // If driver is being changed or added, set status to pending
  if (driverChanged || newDriverAdded) {
    updateData.status = 'pending';
  }
  
  // If driver is removed, set status to pending
  if (driverRemoved) {
    updateData.status = 'pending';
  }
  
  const updated = await Schedule.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  );
  
  // If driver changed or added, handle old ride and create new ride
  if (driverChanged || newDriverAdded) {
    try {
      // Cancel any existing pending/accepted rides for this schedule with old driver
      if (driverChanged && oldDriverId) {
        await Ride.updateMany(
          {
            scheduleId: schedule._id,
            driverId: oldDriverId,
            status: { $in: ['pending', 'accepted'] }
          },
          { status: 'cancelled' }
        );
      }
      
      // Create new ride if new driver is assigned
      if (newDriverId) {
        // Combine date and time to create scheduledTime
        const scheduleDate = new Date(updated.date);
        
        // Parse time format (e.g., "10:30 AM" or "14:30")
        let hour24, minutes;
        if (updated.time.includes('AM') || updated.time.includes('PM')) {
          // 12-hour format
          const timeMatch = updated.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
          if (timeMatch) {
            hour24 = parseInt(timeMatch[1]);
            minutes = parseInt(timeMatch[2]);
            const period = timeMatch[3].toUpperCase();
            if (period === 'PM' && hour24 !== 12) hour24 += 12;
            if (period === 'AM' && hour24 === 12) hour24 = 0;
          }
        } else {
          // 24-hour format
          const [h, m] = updated.time.split(':');
          hour24 = parseInt(h);
          minutes = parseInt(m);
        }
        
        scheduleDate.setHours(hour24, minutes || 0, 0, 0);
        
        // Check if ride already exists for this schedule with new driver
        const existingRide = await Ride.findOne({
          scheduleId: schedule._id,
          driverId: newDriverId,
          status: { $in: ['pending', 'accepted'] }
        });
        
        if (!existingRide) {
          await Ride.create({
            scheduleId: updated._id,
            elderId: updated.elderId,
            driverId: newDriverId,
            familyId: updated.familyId,
            pickupLocation: updated.fromLocation,
            dropLocation: updated.toLocation,
            scheduledTime: scheduleDate,
            status: 'pending' // Driver must accept
          });
          console.log('New ride created for schedule:', updated._id, 'with driver:', newDriverId);
        }
      }
    } catch (rideError) {
      console.error('Error handling rides for schedule update:', rideError);
      // Don't fail schedule update if ride handling fails
    }
  }
  
  // If driver is removed, cancel any pending rides
  if (driverRemoved) {
    try {
      await Ride.updateMany(
        {
          scheduleId: schedule._id,
          status: { $in: ['pending', 'accepted'] }
        },
        { status: 'cancelled' }
      );
    } catch (rideError) {
      console.error('Error cancelling rides when driver removed:', rideError);
    }
  }
  
  return res.json({ schedule: updated });
});

/**
 * @swagger
 * /api/schedules/{id}:
 *   delete:
 *     summary: Delete a schedule
 *     tags:
 *       - Schedules
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Schedule ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Schedule deleted
 *       404:
 *         description: Schedule not found
 */
router.delete('/:id', auth, requireRoles(['elder', 'family']), async (req, res) => {
  const schedule = await Schedule.findById(req.params.id);
  if (!schedule) {
    return res.status(404).json({ message: 'Schedule not found' });
  }
  
  // Check permissions
  if (req.user.role === 'elder' && schedule.elderId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ 
      message: 'Forbidden',
      error: 'You can only delete your own schedules'
    });
  }
  
  if (req.user.role === 'family' && schedule.familyId.toString() !== req.user._id.toString()) {
    // Check if user is linked to the elder
    const linkedMember = await FamilyMember.findOne({
      linkedUserId: req.user._id.toString(),
      elderId: schedule.elderId.toString()
    });
    if (!linkedMember) {
      return res.status(403).json({ 
        message: 'Forbidden',
        error: 'You can only delete schedules for elders you are linked to'
      });
    }
  }
  
  // Cancel all associated rides before deleting schedule
  try {
    const cancelledRides = await Ride.updateMany(
      {
        scheduleId: schedule._id,
        status: { $in: ['pending', 'accepted', 'in_progress'] }
      },
      { status: 'cancelled' }
    );
    
    console.log(`Cancelled ${cancelledRides.modifiedCount} ride(s) for deleted schedule ${schedule._id}`);
    
    // If there were active rides, notify driver
    if (cancelledRides.modifiedCount > 0 && schedule.driverId) {
      // The notification will be handled by the frontend when driver refreshes
      // We can add a notification system here if needed
    }
  } catch (rideError) {
    console.error('Error cancelling rides when schedule deleted:', rideError);
    // Continue with schedule deletion even if ride cancellation fails
  }
  
  await Schedule.findByIdAndDelete(req.params.id);
  return res.json({ 
    message: 'Schedule deleted successfully',
    cancelledRides: true,
    driverId: schedule.driverId,
    scheduleTitle: schedule.title,
    scheduleTime: schedule.time,
    scheduleDate: schedule.date
  });
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
