const express = require('express');
const auth = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /api/settings/me:
 *   get:
 *     summary: Get current user's settings
 *     tags:
 *       - Settings
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User settings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 settings:
 *                   type: object
 *                   properties:
 *                     language:
 *                       type: string
 *                       example: en
 *                     theme:
 *                       type: string
 *                       example: auto
 */
router.get('/me', auth, async (req, res) => {
  return res.json({ settings: { language: 'en', theme: 'auto' } });
});

module.exports = router;
