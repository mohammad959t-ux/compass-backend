const express = require('express');
const router = express.Router();
const {
  createBanner,
  getBanners,
  deleteBanner,
  updateBanner,
  toggleBannerActive,
  upload,
} = require('../controllers/bannerController');
const { protect, admin } = require('../middleware/authMiddleware');

// جلب كل البانرات (Admin)
router.get('/', protect, admin, getBanners);

// إنشاء بانر جديد
router.post('/', protect, admin, upload.single('image'), createBanner);

// تعديل بانر
router.put('/:id', protect, admin, upload.single('image'), updateBanner);

// حذف بانر
router.delete('/:id', protect, admin, deleteBanner);

// تفعيل / تعطيل البانر
router.patch('/:id/toggle', protect, admin, toggleBannerActive);

module.exports = router;
