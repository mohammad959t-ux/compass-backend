const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { uploadReceipt, reviewReceipt, getReceipts } = require('../controllers/receiptController');
const { protect, admin } = require('../middleware/authMiddleware');

// إعداد Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/receipts/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// --- Routes ---
router.post('/upload', protect, upload.single('receipt'), uploadReceipt); // رفع إيصال
router.get('/', protect, admin, getReceipts); // عرض كل الإيصالات
router.put('/:id/review', protect, admin, reviewReceipt); // مراجعة الإيصال

module.exports = router;
