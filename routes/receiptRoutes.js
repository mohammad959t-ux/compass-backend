const express = require('express');
const router = express.Router();
const {
  uploadReceipt,
  reviewReceipt,
  getReceipts,
  getUserReceipts,
} = require('../controllers/receiptController');
const { protect, admin } = require('../middleware/authMiddleware');
const createUploadMiddleware = require('../middleware/upload');

// إعداد upload لمجلد الإيصالات
const upload = createUploadMiddleware('receipts');

// @route   POST /api/receipts/
// @desc    المستخدم يقوم برفع إيصال جديد
// @access  Private
router.post('/', protect, upload.single('receiptImage'), uploadReceipt);

// @route   GET /api/receipts/my-receipts
// @desc    المستخدم يحصل على إيصالاته الخاصة
// @access  Private
router.get('/my-receipts', protect, getUserReceipts);

// @route   GET /api/receipts/
// @desc    المدير يحصل على جميع الإيصالات
// @access  Private/Admin
router.get('/', protect, admin, getReceipts);

// @route   PUT /api/receipts/:id/review
// @desc    المدير يوافق على أو يرفض إيصالاً
// @access  Private/Admin
router.put('/:id/review', protect, admin, reviewReceipt);

module.exports = router;
