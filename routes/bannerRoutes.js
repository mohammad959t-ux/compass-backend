const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
  createBanner,
  getBanners,
  deleteBanner,
  updateBanner,
  toggleBannerActive,
  uploadImageToCloud // تابع رفع الصور بدل multer المحلي
} = require('../controllers/bannerController');

// GET كل البانرات
router.get('/', getBanners);

// POST إنشاء بانر جديد
router.post('/', protect, admin, uploadImageToCloud('image'), createBanner);

// PUT تعديل بانر
router.put('/:id', protect, admin, uploadImageToCloud('image'), updateBanner);

// DELETE حذف بانر
router.delete('/:id', protect, admin, deleteBanner);

// PATCH تفعيل / تعطيل بانر
router.patch('/:id/toggle', protect, admin, toggleBannerActive);

module.exports = router;
