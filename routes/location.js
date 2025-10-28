const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Location = require('../models/Location');

const router = express.Router();

/**
 * @swagger
 * /api/location:
 *   post:
 *     summary: Save current user location
 *     tags:
 *       - Location
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - latitude
 *               - longitude
 *             properties:
 *               latitude:
 *                 type: number
 *                 format: float
 *               longitude:
 *                 type: number
 *                 format: float
 *               accuracy:
 *                 type: number
 *                 format: float
 *               address:
 *                 type: string
 *     responses:
 *       201:
 *         description: Location saved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Location'
 *       400:
 *         description: Validation error
 */
router.post('/', auth, [
  body('latitude').isFloat({ min: -90, max: 90 }),
  body('longitude').isFloat({ min: -180, max: 180 }),
  body('accuracy').optional().isFloat({ min: 0 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { latitude, longitude, accuracy, address } = req.body;
  const doc = await Location.create({
    userId: req.user._id,
    role: req.user.role,
    coords: { type: 'Point', coordinates: [longitude, latitude] },
    accuracy,
    address
  });
  return res.status(201).json({ location: doc });
});

/**
 * @swagger
 * /api/location/me:
 *   get:
 *     summary: Get latest location for current user
 *     tags:
 *       - Location
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Latest location
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Location'
 */
router.get('/me', auth, async (req, res) => {
  const latest = await Location.findOne({ userId: req.user._id }).sort({ createdAt: -1 }).lean();
  return res.json({ location: latest });
});

/**
 * @swagger
 * /api/location/user/{id}:
 *   get:
 *     summary: Get latest location by user ID
 *     tags:
 *       - Location
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Latest location
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Location'
 */
router.get('/user/:id', auth, async (req, res) => {
  const latest = await Location.findOne({ userId: req.params.id }).sort({ createdAt: -1 }).lean();
  return res.json({ location: latest });
});

/**
 * @swagger
 * /api/location/nearby:
 *   get:
 *     summary: Get nearby users within a radius
 *     tags:
 *       - Location
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *           format: float
 *         description: Latitude
 *       - in: query
 *         name: lng
 *         required: true
 *         schema:
 *           type: number
 *           format: float
 *         description: Longitude
 *       - in: query
 *         name: radiusKm
 *         required: false
 *         schema:
 *           type: number
 *           format: float
 *           default: 5
 *         description: Radius in kilometers
 *       - in: query
 *         name: role
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter by user role
 *     responses:
 *       200:
 *         description: Nearby users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Location'
 *       400:
 *         description: Missing or invalid lat/lng
 */
router.get('/nearby', auth, async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const radiusKm = parseFloat(req.query.radiusKm || '5');
  const role = req.query.role;
  if (Number.isNaN(lat) || Number.isNaN(lng)) return res.status(400).json({ message: 'lat and lng are required' });

  const meters = radiusKm * 1000;
  const filter = {
    coords: {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: meters
      }
    }
  };
  if (role) filter.role = role;

  const results = await Location.find(filter).limit(50).lean();
  return res.json({ results });
});

module.exports = router;

/**
 * @swagger
 * components:
 *   schemas:
 *     Location:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         userId:
 *           type: string
 *         role:
 *           type: string
 *         coords:
 *           type: object
 *           properties:
 *             type:
 *               type: string
 *               example: "Point"
 *             coordinates:
 *               type: array
 *               items:
 *                 type: number
 *         accuracy:
 *           type: number
 *         address:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
