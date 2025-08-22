// routes/clientRoutes.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const clientController = require('../controllers/clientController');
const { protect, admin } = require('../middleware/authMiddleware');

// إعداد مكان التخزين لملفات الصور
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // المجلد الذي سيتم حفظ الصور فيه
  },
  filename: (req, file, cb) => {
    // إنشاء اسم فريد للملف
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage: storage });

// تحديد مسارات API
// GET /api/clients: جلب جميع العملاء (متاح للجميع)
router.get('/', clientController.getAllClients);

// POST /api/clients: إضافة عميل جديد (يتطلب صلاحيات مشرف)
router.post('/', protect, admin, upload.single('logo'), clientController.createClient);

// PUT /api/clients/:id: تعديل عميل موجود (يتطلب صلاحيات مشرف)
router.put('/:id', protect, admin, upload.single('logo'), clientController.updateClient);

// DELETE /api/clients/:id: حذف عميل موجود (يتطلب صلاحيات مشرف)
router.delete('/:id', protect, admin, clientController.deleteClient);

module.exports = router; 