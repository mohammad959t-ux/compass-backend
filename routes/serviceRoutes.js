// serviceRoutes.js

const express = require('express');
const router = express.Router();
const {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  syncApiServices,
  upload,
  makeAllServicesVisible
} = require('../controllers/serviceController');
const { protect, admin } = require('../middleware/authMiddleware');

// ==========================
// مسار جلب جميع الخدمات للمستخدم العادي (يدعم الترحيل)
router.get('/', protect, getServices);

// ==========================
// مسار جلب خدمة واحدة
router.get('/:id', protect, getServiceById);

// ==========================
// إنشاء خدمة جديدة (مع رفع صورة)
router.post('/', protect, admin, upload.single('image'), createService);

// ==========================
// تعديل خدمة (مع إمكانية رفع صورة جديدة)
router.put('/:id', protect, admin, upload.single('image'), updateService);

// ==========================
// حذف خدمة
router.delete('/:id', protect, admin, deleteService);

// ==========================
// مزامنة الخدمات من API خارجي (لـ Admin)
router.post('/sync', protect, admin, syncApiServices); // <== تم تغيير get إلى post

// ==========================
// تحديث جميع الخدمات وجعلها مرئية (لـ Admin)
router.post('/make-all-visible', protect, admin, makeAllServicesVisible);

module.exports = router;