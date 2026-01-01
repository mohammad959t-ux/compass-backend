const express = require('express');
const router = express.Router();
const { createDiskUpload } = require('../middleware/uploadConfig');
const upload = createDiskUpload();
const categoryController = require('../controllers/categoryController');
const { protect, admin } = require('../middleware/authMiddleware');

// GET ظƒظ„ ط§ظ„ظپط¦ط§طھ
router.get('/', categoryController.getCategories);

// POST ط¥ظ†ط´ط§ط، ظپط¦ط© ط¬ط¯ظٹط¯ط©
router.post('/', protect, admin, upload.single('image'), categoryController.createCategory);

// PUT طھط¹ط¯ظٹظ„ ظپط¦ط©
router.put('/:id', protect, admin, upload.single('image'), categoryController.updateCategory);

// DELETE ط­ط°ظپ ظپط¦ط©
router.delete('/:id', protect, admin, categoryController.deleteCategory);

module.exports = router;

