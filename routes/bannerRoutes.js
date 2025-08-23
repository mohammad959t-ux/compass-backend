const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // رفع مؤقت قبل Cloudinary
const { protect, admin } = require('../middleware/authMiddleware');
const {
  createBanner,
  getBanners,
  deleteBanner,
  updateBanner,
  toggleBannerActive,
} = require('../controllers/bannerController');

// GET كل البانرات
router.get('/', getBanners);

// POST إنشاء بانر جديد
router.post('/', protect, admin, upload.single('image'), createBanner);

// PUT تعديل بانر
router.put('/:id', protect, admin, upload.single('image'), updateBanner);

// DELETE حذف بانر
router.delete('/:id', protect, admin, deleteBanner);

// PATCH تفعيل / تعطيل بانر
router.patch('/:id/toggle', protect, admin, toggleBannerActive);

module.exports = router;
