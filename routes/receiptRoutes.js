const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
  uploadReceipt,
  reviewReceipt,
  getReceipts,
  getUserReceipts
} = require('../controllers/receiptController');

// POST رفع إيصال جديد
router.post('/', protect, uploadReceipt);

// GET إيصالات المستخدم
router.get('/my-receipts', protect, getUserReceipts);

// GET كل الإيصالات (Admin)
router.get('/', protect, admin, getReceipts);

// PUT مراجعة إيصال (Admin)
router.put('/:id/review', protect, admin, reviewReceipt);

module.exports = router;
