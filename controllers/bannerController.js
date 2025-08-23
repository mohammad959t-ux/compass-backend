const asyncHandler = require('express-async-handler');
const Banner = require('../models/Banner');
const { uploadImageToCloud } = require('../utils/cloudinary'); // دالة رفع الصور للسحابة

// إنشاء بانر جديد
const createBanner = asyncHandler(async (req, res) => {
  const { title, description, offerLink } = req.body;
  if (!req.file || !offerLink) {
    res.status(400);
    throw new Error('Please provide image and offer link');
  }

  // رفع الصورة للسحابة
  const imageUrl = await uploadImageToCloud(req.file);

  const banner = await Banner.create({
    title,
    description,
    offerLink,
    imageUrl,
    createdBy: req.user._id,
  });

  res.status(201).json(banner);
});

// جلب البانرات النشطة
const getBanners = asyncHandler(async (req, res) => {
  const banners = await Banner.find({ isActive: true });
  res.json(banners);
});

// حذف بانر
const deleteBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.findById(req.params.id);
  if (!banner) {
    res.status(404);
    throw new Error('Banner not found');
  }
  await banner.remove();
  res.json({ message: 'Banner removed' });
});

// تعديل بانر
const updateBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.findById(req.params.id);
  if (!banner) {
    res.status(404);
    throw new Error('Banner not found');
  }

  banner.title = req.body.title || banner.title;
  banner.description = req.body.description || banner.description;
  banner.offerLink = req.body.offerLink || banner.offerLink;

  if (req.file) {
    const imageUrl = await uploadImageToCloud(req.file);
    banner.imageUrl = imageUrl;
  }

  const updatedBanner = await banner.save();
  res.json(updatedBanner);
});

// تفعيل/تعطيل البانر
const toggleBannerActive = asyncHandler(async (req, res) => {
  const banner = await Banner.findById(req.params.id);
  if (!banner) {
    res.status(404);
    throw new Error('Banner not found');
  }
  banner.isActive = !banner.isActive;
  const updatedBanner = await banner.save();
  res.json(updatedBanner);
});

module.exports = {
  createBanner,
  getBanners,
  deleteBanner,
  updateBanner,
  toggleBannerActive,
};
