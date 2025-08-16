const asyncHandler = require('express-async-handler');
const multer = require('multer');
const path = require('path');
const Banner = require('../models/Banner');

// إعداد التخزين لـ multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 1000000 },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) return cb(null, true);
    cb('Error: Images Only!');
  },
});

// إنشاء بانر جديد
const createBanner = asyncHandler(async (req, res) => {
  const { title, offerLink } = req.body;
  if (!req.file || !offerLink) {
    res.status(400);
    throw new Error('Please provide image and offer link');
  }

  const banner = await Banner.create({
    title,
    offerLink,
    imageUrl: `/uploads/${req.file.filename}`,
    createdBy: req.user._id,
  });

  res.status(201).json(banner);
});

// جلب البانرات النشطة
const getBanners = asyncHandler(async (req, res) => {
  const banners = await Banner.find();
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
  banner.offerLink = req.body.offerLink || banner.offerLink;

  if (req.file) {
    banner.imageUrl = `/uploads/${req.file.filename}`;
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
  upload,
};
