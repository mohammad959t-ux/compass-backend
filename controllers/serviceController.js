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
  const limit = parseInt(req.query.limit) || 20; // عدد الخدمات في الصفحة
  const skip = (page - 1) * limit;

  const services = await Service.find({ isVisible: true })
    .skip(skip)
    .limit(limit)
    .populate('plans');
  
  const profitMargin = 0.2;
  const servicesWithProfit = services.map(service => ({
    ...service.toObject(),
    price: service.price * (1 + profitMargin)
  }));
  res.json(servicesWithProfit);
});

// ==========================
// جلب خدمة واحدة
const getServiceById = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) {
    res.status(404);
    throw new Error('Service not found.');
  }
  const profitMargin = 0.2;
  res.json({ ...service.toObject(), price: service.price * (1 + profitMargin) });
});

// ==========================
// إنشاء خدمة جديدة (مع صورة)
const createService = asyncHandler(async (req, res) => {
  const { name, description, category, subCategory, price } = req.body;
  if (!req.file) {
    res.status(400);
    throw new Error('يرجى رفع صورة للخدمة');
  }

  const service = new Service({
    name,
    description,
    category,
    subCategory,
    price,
    imageUrl: `/uploads/${req.file.filename}`,
    createdBy: req.user._id
  });

  await service.save();
  res.status(201).json(service);
});

// ==========================
// تعديل خدمة (مع إمكانية رفع صورة جديدة)
const updateService = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) {
    res.status(404);
    throw new Error('Service not found.');
  }

  service.name = req.body.name || service.name;
  service.description = req.body.description || service.description;
  service.category = req.body.category || service.category;
  service.subCategory = req.body.subCategory || service.subCategory;
  service.price = req.body.price || service.price;

  if (req.file) {
    service.imageUrl = `/uploads/${req.file.filename}`;
  }

  const updatedService = await service.save();
  res.json(updatedService);
});

// ==========================
// حذف خدمة
const deleteService = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) {
    res.status(404);
    throw new Error('Service not found.');
  }
  await service.remove();
  res.json({ message: 'Service removed.' });
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

      try {
        const [nameRes, descRes] = await Promise.all([
          translate(translatedName, { to: 'ar' }),
          translate(translatedDescription, { to: 'ar' })
        ]);
        translatedName = nameRes.text;
        translatedDescription = descRes.text;
      } catch (e) { console.error('Translation failed', e); }

      let subCategory = 'أخرى';
      const nameLower = serviceData.name.toLowerCase();
      if (translatedName.includes('انستغرام') || nameLower.includes('instagram')) subCategory = 'خدمات انستغرام';
      else if (translatedName.includes('فيسبوك') || nameLower.includes('facebook')) subCategory = 'خدمات فيسبوك';
      else if (translatedName.includes('يوتيوب') || nameLower.includes('youtube')) subCategory = 'خدمات يوتيوب';
      else if (translatedName.includes('تويتر') || nameLower.includes('twitter')) subCategory = 'خدمات تويتر';

      let service = await Service.findOne({ apiServiceId: serviceData.service });
      if (!service) {
        service = new Service({
          apiServiceId: serviceData.service,
          name: translatedName,
          description: translatedDescription,
          category: 'زيادة التفاعل',
          subCategory,
          price: serviceData.rate || 0,
          min: serviceData.min || 1,
          max: serviceData.max || 1,
          createdBy: adminUser._id
        });
      } else {
        service.name = translatedName;
        service.description = translatedDescription;
        service.category = 'زيادة التفاعل';
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
// تحديث جميع الخدمات وجعلها مرئية
const makeAllServicesVisible = asyncHandler(async (req, res) => {
  await Service.updateMany({}, { isVisible: true });
  res.status(200).json({ message: 'All services are now visible.' });
});

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