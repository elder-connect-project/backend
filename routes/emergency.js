const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const { requireRoles } = require('../middleware/roleAuth');
const EmergencyContact = require('../models/EmergencyContact');

const router = express.Router();

/**
 * @swagger
 * /api/emergency:
 *   get:
 *     summary: List emergency contacts for an elder
 *     tags:
 *       - Emergency
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: elderId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the elder
 *     responses:
 *       200:
 *         description: List of emergency contacts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 contacts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EmergencyContact'
 *       400:
 *         description: elderId is required
 */
router.get('/', auth, requireRoles(['elder', 'family']), async (req, res) => {
  const { elderId } = req.query;
  if (!elderId) return res.status(400).json({ message: 'elderId is required' });
  
  // If user is elder, they can only see their own emergency contacts
  if (req.user.role === 'elder' && elderId !== req.user._id.toString()) {
    return res.status(403).json({ 
      message: 'Forbidden',
      error: 'Elders can only view their own emergency contacts'
    });
  }
  
  const contacts = await EmergencyContact.find({ elderId }).sort({ priority: 1 }).lean();
  return res.json({ contacts });
});

/**
 * @swagger
 * /api/emergency:
 *   post:
 *     summary: Create a new emergency contact
 *     tags:
 *       - Emergency
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
 *               priority:
 *                 type: integer
 *                 minimum: 1
 *     responses:
 *       201:
 *         description: Emergency contact created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmergencyContact'
 *       400:
 *         description: Validation error
 */
router.post('/', auth, requireRoles(['elder', 'family']), [
  body('elderId').notEmpty(),
  body('name').notEmpty(),
  body('phone').notEmpty(),
  body('relation').notEmpty(),
  body('priority').optional().isInt({ min: 1 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  
  // If user is elder, they can only add emergency contacts for themselves
  if (req.user.role === 'elder' && req.body.elderId !== req.user._id.toString()) {
    return res.status(403).json({ 
      message: 'Forbidden',
      error: 'Elders can only add emergency contacts for themselves'
    });
  }
  
  const contact = await EmergencyContact.create(req.body);
  return res.status(201).json({ contact });
});

/**
 * @swagger
 * /api/emergency/{id}:
 *   put:
 *     summary: Update an emergency contact
 *     tags:
 *       - Emergency
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Emergency contact ID
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               relation:
 *                 type: string
 *               priority:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Emergency contact updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmergencyContact'
 *       404:
 *         description: Emergency contact not found
 */
router.put('/:id', auth, requireRoles(['elder', 'family']), async (req, res) => {
  const contact = await EmergencyContact.findById(req.params.id);
  if (!contact) return res.status(404).json({ message: 'Emergency contact not found' });
  
  // If user is elder, they can only update their own emergency contacts
  if (req.user.role === 'elder' && contact.elderId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ 
      message: 'Forbidden',
      error: 'Elders can only update their own emergency contacts'
    });
  }
  
  const updated = await EmergencyContact.findByIdAndUpdate(req.params.id, req.body, { new: true });
  return res.json({ contact: updated });
});

/**
 * @swagger
 * /api/emergency/{id}:
 *   delete:
 *     summary: Delete an emergency contact
 *     tags:
 *       - Emergency
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Emergency contact ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Emergency contact deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Emergency contact not found
 */
router.delete('/:id', auth, requireRoles(['elder', 'family']), async (req, res) => {
  const contact = await EmergencyContact.findById(req.params.id);
  if (!contact) return res.status(404).json({ message: 'Emergency contact not found' });
  
  // If user is elder, they can only delete their own emergency contacts
  if (req.user.role === 'elder' && contact.elderId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ 
      message: 'Forbidden',
      error: 'Elders can only delete their own emergency contacts'
    });
  }
  
  await EmergencyContact.findByIdAndDelete(req.params.id);
  return res.json({ message: 'Emergency contact deleted' });
});

module.exports = router;

/**
 * @swagger
 * components:
 *   schemas:
 *     EmergencyContact:
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
 *         priority:
 *           type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
