const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const serviceController = require('../controllers/serviceController');

// ---------------------------------------------
// تحميل صورة الخدمة
// ---------------------------------------------
router.post('/upload', protect, serviceController.upload.single('image'), (req, res) => {
  res.json({ filename: req.file.filename, path: `/uploads/${req.file.filename}` });
});

// ---------------------------------------------
// جلب الخدمات للمستخدم
// ---------------------------------------------
router.get('/', serviceController.getServices);

// ---------------------------------------------
// جلب كل الخدمات للأدمن
// ---------------------------------------------
router.get('/admin', protect, admin, serviceController.getServicesAdmin);

// ---------------------------------------------
// جلب الفئات الرئيسية والفرعية
// ---------------------------------------------
router.get('/categories', serviceController.getCategories);

// ---------------------------------------------
// مزامنة الخدمات من API خارجي
// ---------------------------------------------
router.post('/sync', protect, admin, serviceController.syncApiServices);

// ---------------------------------------------
// إنشاء خدمة جديدة
// ---------------------------------------------
router.post('/', protect, serviceController.upload.single('image'), serviceController.createService);

// ---------------------------------------------
// تعديل خدمة
// ---------------------------------------------
router.put('/:id', protect, serviceController.updateService);

// ---------------------------------------------
// حذف خدمة واحدة
// ---------------------------------------------
router.delete('/:id', protect, serviceController.deleteService);

// ---------------------------------------------
// حذف كل الخدمات
// ---------------------------------------------
router.delete('/', protect, admin, serviceController.deleteAllServices);

// ---------------------------------------------
// جعل كل الخدمات مرئية
// ---------------------------------------------
router.put('/make-visible/all', protect, admin, serviceController.makeAllServicesVisible);

// ---------------------------------------------
// جلب خدمة واحدة
// ---------------------------------------------
router.get('/:id', serviceController.getServiceById);

module.exports = router;
