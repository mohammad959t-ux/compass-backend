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
  makeAllServicesVisible // <== قم بإضافة هذه الدالة هنا
} = require('../controllers/serviceController');
const { protect, admin } = require('../middleware/authMiddleware');

// ==========================
// مسار جلب جميع الخدمات للمستخدم العادي
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
router.get('/sync', protect, admin, syncApiServices);

// ==========================
// تحديث جميع الخدمات وجعلها مرئية (لـ Admin)
router.post('/make-all-visible', protect, admin, makeAllServicesVisible); // <== قم بإضافة هذا المسار

module.exports = router;