const express = require('express');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  return res.json({ notifications: [] });
});

module.exports = router;

