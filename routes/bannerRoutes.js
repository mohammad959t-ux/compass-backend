const express = require('express');
const router = express.Router();
const { createDiskUpload } = require('../middleware/uploadConfig');
const upload = createDiskUpload();
const { protect, admin } = require('../middleware/authMiddleware');
const {
  createBanner,
  getBanners,
  deleteBanner,
  updateBanner,
  toggleBannerActive,
} = require('../controllers/bannerController');

// GET ظƒظ„ ط§ظ„ط¨ط§ظ†ط±ط§طھ
router.get('/', getBanners);

// POST ط¥ظ†ط´ط§ط، ط¨ط§ظ†ط± ط¬ط¯ظٹط¯
router.post('/', protect, admin, upload.single('image'), createBanner);

// PUT طھط¹ط¯ظٹظ„ ط¨ط§ظ†ط±
router.put('/:id', protect, admin, upload.single('image'), updateBanner);

// DELETE ط­ط°ظپ ط¨ط§ظ†ط±
router.delete('/:id', protect, admin, deleteBanner);

// PATCH طھظپط¹ظٹظ„ / طھط¹ط·ظٹظ„ ط¨ط§ظ†ط±
router.patch('/:id/toggle', protect, admin, toggleBannerActive);

module.exports = router;

