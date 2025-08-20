const express = require('express');
const router = express.Router();
const {
  getServices,
  getServicesAdmin,
  getServiceById,
  createService,
  updateService,
  deleteService,
  deleteAllServices,
  syncApiServices,
  upload,
  makeAllServicesVisible
} = require('../controllers/serviceController');
const { protect, admin } = require('../middleware/authMiddleware');

// ==========================
// جلب جميع الخدمات للمستخدم (مع ترحيل + بحث + فرز)
router.get('/', protect, getServices);

// ==========================
// جلب جميع الخدمات للأدمن (مفلترة + بحث + فرز)
router.get('/admin/all', protect, admin, getServicesAdmin);

// ==========================
// مسارات ثابتة قبل الديناميكية
router.post('/sync', protect, admin, syncApiServices);           // مزامنة الخدمات من API خارجي
router.post('/make-all-visible', protect, admin, makeAllServicesVisible); // جعل كل الخدمات مرئية
router.delete('/delete-all', protect, admin, deleteAllServices); // حذف جميع الخدمات

// ==========================
// مسار ديناميكي: خدمة واحدة
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

module.exports = router;
