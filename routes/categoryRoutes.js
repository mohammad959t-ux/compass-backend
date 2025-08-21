const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { protectAdmin } = require('../middleware/authMiddleware'); // لو عندك middleware حماية الأدمن

router.get('/', categoryController.getCategories);
router.post('/', protectAdmin, categoryController.upload.single('image'), categoryController.createCategory);
router.put('/:id', protectAdmin, categoryController.upload.single('image'), categoryController.updateCategory);
router.delete('/:id', protectAdmin, categoryController.deleteCategory);

module.exports = router;
