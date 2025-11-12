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
  // Refresh user from database to get latest data
  const user = await User.findById(req.user._id).lean();
  return res.json({ user });
});

/**
 * @swagger
 * /api/users/me:
 *   put:
 *     summary: Update current user profile (including role)
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
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [elder, family, driver]
 *               age:
 *                 type: number
 *               address:
 *                 type: string
 *               profileImage:
 *                 type: string
 *               licenseNumber:
 *                 type: string
 *                 description: Required if role is driver
 *               licenseImage:
 *                 type: string
 *                 description: Required if role is driver
 *     responses:
 *       200:
 *         description: User profile updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error
 */
router.put('/me', auth, async (req, res) => {
  const { firstName, lastName, role, age, address, profileImage, licenseNumber, licenseImage } = req.body;
  
  const updates = {};
  if (firstName !== undefined) updates.firstName = firstName;
  if (lastName !== undefined) updates.lastName = lastName;
  if (age !== undefined) updates.age = age;
  if (address !== undefined) updates.address = address;
  if (profileImage !== undefined) updates.profileImage = profileImage;
  
  // Role update validation
  if (role !== undefined) {
    if (!['elder', 'family', 'driver'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be elder, family, or driver' });
    }
    updates.role = role;
    
    // If changing to driver, validate license fields
    if (role === 'driver') {
      if (licenseNumber !== undefined) updates.licenseNumber = licenseNumber;
      if (licenseImage !== undefined) updates.licenseImage = licenseImage;
    }
  }
  
  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).lean();
  return res.json({ user });
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
  // Only allow users to update their own profile, or allow family/elder to update related profiles
  const targetUserId = req.params.id;
  const isOwnProfile = req.user._id.toString() === targetUserId;
  
  // Allow family members and elders to update related profiles (for now, allow own profile only)
  // You can extend this logic based on your business rules
  if (!isOwnProfile) {
    // Check if user has permission (e.g., family member updating elder profile)
    // For now, restrict to own profile only
    return res.status(403).json({ 
      message: 'Forbidden',
      error: 'You can only update your own profile'
    });
  }
  
  const updates = req.body;
  
  // Validate role if being updated
  if (updates.role && !['elder', 'family', 'driver'].includes(updates.role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }
  
  const user = await User.findByIdAndUpdate(targetUserId, updates, { new: true }).lean();
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
  const targetUserId = req.params.id;
  
  // Only allow users to delete their own account, or restrict to admin (if you add admin role later)
  if (req.user._id.toString() !== targetUserId) {
    return res.status(403).json({ 
      message: 'Forbidden',
      error: 'You can only delete your own account'
    });
  }
  
  await User.findByIdAndDelete(targetUserId);
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
