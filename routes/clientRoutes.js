// routes/clientRoutes.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const clientController = require('../controllers/clientController');
const { protect, admin } = require('../middleware/authMiddleware'); // <--- استيراد middleware

// إعداد مكان التخزين لملفات الصور
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage: storage });

// تحديد مسارات API
// GET /api/clients: هذا المسار لا يتطلب صلاحيات، أي شخص يمكنه الوصول إليه
router.get('/', clientController.getAllClients);

// POST /api/clients: هذا المسار يتطلب أن يكون المستخدم مسجلاً دخوله (protect) ومشرفاً (admin)
router.post('/', protect, admin, upload.single('logo'), clientController.createClient);

module.exports = router;