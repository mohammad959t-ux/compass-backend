// lib/routes/serviceRoutes.js
const express = require('express');
const router = express.Router();
const {
  getServices,
  getApiService,
  updateService,
  createService,
  deleteService,
  getServiceById,
  syncApiServices
} = require('../controllers/serviceController');
const { protect, admin } = require('../middleware/authMiddleware');

// مسار لجلب جميع الخدمات (للمستخدم العادي)
router.get('/', protect, getServices);

// مسار لجلب الخدمات من API خارجي (للمدير فقط)
router.get('/api-services', protect, admin, getApiService);

// 🛠️ مسار جديد لمزامنة الخدمات من API خارجي
router.get('/sync', protect, admin, syncApiServices);

// مسار لجلب خدمة معينة
router.get('/:id', protect, getServiceById);

// مسار لتحديث خدمة (للمدير فقط)
router.put('/:id', protect, admin, updateService);

// مسار لإنشاء خدمة جديدة (للمدير فقط)
router.post('/', protect, admin, createService);

// مسار لحذف خدمة (للمدير فقط)
router.delete('/:id', protect, admin, deleteService);

module.exports = router;