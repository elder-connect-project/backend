const express = require('express');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/me', auth, async (req, res) => {
  return res.json({ settings: { language: 'en', theme: 'auto' } });
});

module.exports = router;
