// routes/walletRoutes.js
const express = require('express');
const router = express.Router();
const { creditUserWallet } = require('../controllers/walletController');
const { protect, admin } = require('../middleware/authMiddleware');

// شحن رصيد للمستخدم (Admin فقط)
router.post('/credit', protect, admin, creditUserWallet);

module.exports = router;
