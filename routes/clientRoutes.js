const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // رفع مؤقت قبل Cloudinary
const clientController = require('../controllers/clientController');
const { protect, admin } = require('../middleware/authMiddleware');

// GET كل العملاء
router.get('/', clientController.getAllClients);

// POST إنشاء عميل جديد
router.post('/', protect, admin, upload.single('logo'), clientController.createClient);

module.exports = router;
