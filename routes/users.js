const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');




const router = express.Router();

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 */
router.get('/me', auth, async (req, res) => {
  return res.json({ user: req.user });
});

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: List users with optional role filter
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter users by role (elder, family, driver)
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 */
router.get('/', auth, async (req, res) => {
  const { role } = req.query;
  const filter = {};
  if (role) filter.role = role;
  const users = await User.find(filter).limit(100).lean();
  return res.json({ users });
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User info
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
router.get('/:id', auth, async (req, res) => {
  const user = await User.findById(req.params.id).lean();
  return res.json({ user });
});

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user by ID
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Updated user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
router.put('/:id', auth, async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
  return res.json({ user });
});

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete user by ID
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User deleted successfully
 */
router.delete('/:id', auth, async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  return res.json({ message: 'User deleted successfully' });
});

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a new user
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - age
 *               - address
 *               - firstName
 *               - lastName
 *               - phoneNumber
 *               - role
 *             properties:
 *               age:
 *                 type: number
 *               address:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [elder, family, driver]
 *               licenseNumber:
 *                 type: string
 *               licenseImage:
 *                 type: string
 *               isAvailable:
 *                 type: boolean
 *               profileImage:
 *                 type: string
 *     responses:
 *       200:
 *         description: Created user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error
 */
router.post('/', auth, async (req, res) => {
  const { age, address, firstName, lastName, phoneNumber, role } = req.body;
  if (!age || !address || !firstName || !lastName || !phoneNumber || !role)
    return res.status(400).json({ message: 'All fields are required' });
  if (role !== 'elder' && role !== 'family' && role !== 'driver')
    return res.status(400).json({ message: 'Invalid role' });
  // Additional driver validations omitted for brevity
  const user = await User.create({ age, address, firstName, lastName, phoneNumber, role });
  return res.json({ user });
});

module.exports = router;

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         age:
 *           type: number
 *         address:
 *           type: string
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         phoneNumber:
 *           type: string
 *         role:
 *           type: string
 *           enum: [elder, family, driver]
 *         licenseNumber:
 *           type: string
 *         licenseImage:
 *           type: string
 *         isAvailable:
 *           type: boolean
 *         profileImage:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
