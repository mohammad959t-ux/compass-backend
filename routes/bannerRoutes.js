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

// جلب كل البانرات (للمستخدمين العاديين) - لا يتطلب صلاحيات مسؤول
router.get('/', getBanners);

// إنشاء بانر جديد (للأدمن فقط)
router.post('/', protect, admin, upload.single('image'), createBanner);

// تعديل بانر (للأدمن فقط)
router.put('/:id', protect, admin, upload.single('image'), updateBanner);

// حذف بانر (للأدمن فقط)
router.delete('/:id', protect, admin, deleteBanner);

// تفعيل / تعطيل البانر (للأدمن فقط)
router.patch('/:id/toggle', protect, admin, toggleBannerActive);

module.exports = router;
