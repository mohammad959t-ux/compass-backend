const express = require('express');
const router = express.Router();
const { getTotalIncome } = require('../controllers/analyticsController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/income', protect, admin, getTotalIncome);

module.exports = router;