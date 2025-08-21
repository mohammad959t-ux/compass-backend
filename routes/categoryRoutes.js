const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { protect, admin } = require('../middleware/authMiddleware');

// جلب جميع الفئات
router.get('/', categoryController.getCategories);

// إنشاء فئة جديدة (محمي للأدمن)
router.post(
  '/',
  protect,
  admin,
  categoryController.upload.single('image'),
  categoryController.createCategory
);

// تعديل فئة (محمي للأدمن)
router.put(
  '/:id',
  protect,
  admin,
  categoryController.upload.single('image'),
  categoryController.updateCategory
);

// حذف فئة (محمي للأدمن)
router.delete(
  '/:id',
  protect,
  admin,
  categoryController.deleteCategory
);

module.exports = router;
