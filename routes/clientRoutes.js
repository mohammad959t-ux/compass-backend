const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const { protect, admin } = require('../middleware/authMiddleware');

// استيراد الـ upload middleware المخصص
const createUploadMiddleware = require('../middleware/upload');

// إعداد upload لمجلد العملاء (مثلاً 'clients')
const upload = createUploadMiddleware('clients');

// تحديد مسارات API
// GET /api/clients: هذا المسار لا يتطلب صلاحيات
router.get('/', clientController.getAllClients);

// POST /api/clients: يتطلب حماية وصلاحيات مشرف
router.post('/', protect, admin, upload.single('logo'), clientController.createClient);

module.exports = router;
