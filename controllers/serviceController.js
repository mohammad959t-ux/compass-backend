// serviceController.js

const asyncHandler = require('express-async-handler');
const axios = require('axios');
const translate = require('@iamtraction/google-translate');
const Service = require('../models/Service');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');

// إعداد multer لتخزين الصور
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage });

// ==========================
// جلب الخدمات للمستخدم العادي (مع دعم الترحيل)
const getServices = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  // جلب الخدمات مع تصنيفاتها الرئيسية
  const services = await Service.find({ isVisible: true })
    .skip(skip)
    .limit(limit)
    .populate('plans')
    .sort({ mainCategory: 1, subCategory: 1 }); // فرز الخدمات حسب التصنيف الرئيسي ثم الفرعي

  const profitMargin = 0.2;
  const servicesWithProfit = services.map(service => ({
    ...service.toObject(),
    price: service.price * (1 + profitMargin)
  }));
  res.json(servicesWithProfit);
});

// ==========================
// مزامنة الخدمات من API خارجي
const syncApiServices = asyncHandler(async (req, res) => {
  try {
    const response = await axios.post(process.env.METJAR_API_URL, {
      key: process.env.METJAR_API_KEY,
      action: 'services'
    });
    const externalServices = response.data;

    if (!Array.isArray(externalServices)) {
      return res.status(500).json({ message: 'External API did not return a list.' });
    }

    const adminUser = await User.findOne({ isAdmin: true });
    if (!adminUser) return res.status(500).json({ message: 'No admin found.' });

    const savedServices = await Promise.all(externalServices.map(async (serviceData) => {
      let translatedName = serviceData.name || 'Unnamed Service';
      let translatedDescription = serviceData.description || 'No description';

      // دالة لتصنيف الخدمات بناءً على الكلمات المفتاحية
      const getSubCategory = (name) => {
        const nameLower = name.toLowerCase();
        if (nameLower.includes('انستغرام') || nameLower.includes('instagram')) return 'انستغرام';
        if (nameLower.includes('فيسبوك') || nameLower.includes('facebook')) return 'فيسبوك';
        if (nameLower.includes('يوتيوب') || nameLower.includes('youtube')) return 'يوتيوب';
        if (nameLower.includes('تويتر') || nameLower.includes('twitter')) return 'تويتر';
        if (nameLower.includes('لينكدإن') || nameLower.includes('linkedin')) return 'لينكدإن';
        if (nameLower.includes('تيك توك') || nameLower.includes('tiktok')) return 'تيك توك';
        if (nameLower.includes('تيليجرام') || nameLower.includes('telegram')) return 'تيليجرام';
        if (nameLower.includes('سبوتيفاي') || nameLower.includes('spotify')) return 'سبوتيفاي';
        if (nameLower.includes('ساوندكلاود') || nameLower.includes('soundcloud')) return 'ساوندكلاود';
        if (nameLower.includes('website') || nameLower.includes('traffic')) return 'زيارات مواقع';
        return 'أخرى';
      };

      // الترجمة إلى العربية
      try {
        const [nameRes, descRes] = await Promise.all([
          translate(translatedName, { to: 'ar' }),
          translate(translatedDescription, { to: 'ar' })
        ]);
        translatedName = nameRes.text;
        translatedDescription = descRes.text;
      } catch (e) {
        console.error('Translation failed', e);
      }

      // تحديد الفئات الفرعية
      const subCategory = getSubCategory(translatedName);

      let service = await Service.findOne({ apiServiceId: serviceData.service });
      if (!service) {
        service = new Service({
          apiServiceId: serviceData.service,
          name: translatedName,
          description: translatedDescription,
          mainCategory: 'زيادة التفاعل', // تصنيف الخدمات المستوردة
          subCategory,
          price: serviceData.rate || 0,
          min: serviceData.min || 1,
          max: serviceData.max || 1,
          createdBy: adminUser._id
        });
      } else {
        service.name = translatedName;
        service.description = translatedDescription;
        service.mainCategory = 'زيادة التفاعل'; // تأكيد التصنيف
        service.subCategory = subCategory;
        service.price = serviceData.rate || service.price;
        service.min = serviceData.min || service.min;
        service.max = serviceData.max || service.max;
        service.createdBy = adminUser._id;
      }

      await service.save();
      return service;
    }));

    res.status(200).json({ message: 'Services synced', servicesCount: savedServices.length, services: savedServices });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to sync services', error: error.message });
  }
});

// ==========================
// جلب خدمة واحدة
const getServiceById = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);

  if (!service) {
    res.status(404);
    throw new Error('Service not found');
  }
  res.json(service);
});

// ==========================
// إنشاء خدمة جديدة
const createService = asyncHandler(async (req, res) => {
  const { name, description, price, min, max, mainCategory, subCategory } = req.body;

  if (!name || !price || !min || !max || !mainCategory || !subCategory) {
    res.status(400);
    throw new Error('Please fill all required fields');
  }

  const service = new Service({
    name,
    description,
    price,
    min,
    max,
    mainCategory,
    subCategory,
    createdBy: req.user.id,
    imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
  });

  const savedService = await service.save();
  res.status(201).json(savedService);
});

// ==========================
// تعديل خدمة
const updateService = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);

  if (!service) {
    res.status(404);
    throw new Error('Service not found');
  }

  if (!req.user) {
    res.status(401);
    throw new Error('User not found');
  }

  if (service.createdBy.toString() !== req.user.id && !req.user.isAdmin) {
    res.status(401);
    throw new Error('User not authorized to update this service');
  }

  const updatedService = await Service.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );

  res.json(updatedService);
});

// ==========================
// حذف خدمة
const deleteService = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);

  if (!service) {
    res.status(404);
    throw new Error('Service not found');
  }

  if (!req.user) {
    res.status(401);
    throw new Error('User not found');
  }

  if (service.createdBy.toString() !== req.user.id && !req.user.isAdmin) {
    res.status(401);
    throw new Error('User not authorized to delete this service');
  }

  await service.deleteOne();
  res.json({ message: 'Service removed' });
});

// ==========================
// جعل كل الخدمات مرئية
const makeAllServicesVisible = asyncHandler(async (req, res) => {
  await Service.updateMany({}, { isVisible: true });
  res.json({ message: 'All services are now visible' });
});

// ==========================
// تصدير جميع الدوال
module.exports = {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  syncApiServices,
  upload,
  makeAllServicesVisible
};