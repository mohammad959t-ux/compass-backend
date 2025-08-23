const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // رفع مؤقت قبل Cloudinary
const categoryController = require('../controllers/categoryController');
const { protect, admin } = require('../middleware/authMiddleware');

// GET كل الفئات
router.get('/', categoryController.getCategories);

// POST إنشاء فئة جديدة
router.post('/', protect, admin, upload.single('image'), categoryController.createCategory);

// PUT تعديل فئة
router.put('/:id', protect, admin, upload.single('image'), categoryController.updateCategory);

// DELETE حذف فئة
router.delete('/:id', protect, admin, categoryController.deleteCategory);

module.exports = router;
