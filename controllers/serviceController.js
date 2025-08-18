// lib/controllers/serviceController.js

const asyncHandler = require('express-async-handler');
const axios = require('axios');
const translate = require('google-translate-api');
const Service = require('../models/Service');
const User = require('../models/User');

// ==========================
// دالة جلب الخدمات للمستخدم العادي
const getServices = asyncHandler(async (req, res) => {
  const services = await Service.find({ isVisible: true }).populate('plans');
  res.json(services);
});

// ==========================
// جلب الخدمات من API خارجي (لـ Admin)
const getApiService = asyncHandler(async (req, res) => {
  try {
    const response = await axios.post(process.env.METJAR_API_URL, {
      key: process.env.METJAR_API_KEY,
      action: 'services'
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching services from external API:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ message: 'Failed to fetch services from external API.' });
  }
});

// ==========================
// إنشاء خدمة جديدة (لـ Admin)
const createService = asyncHandler(async (req, res) => {
  const service = new Service(req.body);
  await service.save();
  res.status(201).json(service);
});

// ==========================
// تحديث خدمة (لـ Admin)
const updateService = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const service = await Service.findById(id);
  if (!service) {
    res.status(404);
    throw new Error('Service not found.');
  }
  const updatedService = await Service.findByIdAndUpdate(id, req.body, { new: true });
  res.json(updatedService);
});

// ==========================
// حذف خدمة (لـ Admin)
const deleteService = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const service = await Service.findById(id);
  if (!service) {
    res.status(404);
    throw new Error('Service not found.');
  }
  await service.remove();
  res.json({ message: 'Service removed.' });
});

// ==========================
// جلب خدمة واحدة
const getServiceById = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) {
    res.status(404);
    throw new Error('Service not found.');
  }
  res.json(service);
});

// ==========================
// 🛠️ مزامنة الخدمات من API الخارجي
const syncApiServices = asyncHandler(async (req, res) => {
  try {
    const response = await axios.post(process.env.METJAR_API_URL, {
      key: process.env.METJAR_API_KEY,
      action: 'services'
    });

    const externalServices = response.data;

    if (!Array.isArray(externalServices)) {
      return res.status(500).json({ message: 'External API did not return a list of services.' });
    }

    const adminUser = await User.findOne({ isAdmin: true });
    if (!adminUser) {
      return res.status(500).json({ message: 'No admin user found to assign createdBy.' });
    }

    const savedServices = [];

    for (const serviceData of externalServices) {
      // 1. ترجمة الاسم والوصف
      let translatedName = serviceData.name || 'Unnamed Service';
      let translatedDescription = serviceData.description || 'No description';
      try {
        const nameRes = await translate(translatedName, { from: 'en', to: 'ar' });
        translatedName = nameRes.text;
        const descRes = await translate(translatedDescription, { from: 'en', to: 'ar' });
        translatedDescription = descRes.text;
      } catch (e) {
        console.error('Translation failed for service:', serviceData.service, e);
      }

      // 2. التصنيف الفرعي فقط (بدون صور تلقائية)
      let subCategory = 'أخرى';
      if (translatedName.includes('انستغرام') || serviceData.name.toLowerCase().includes('instagram')) {
        subCategory = 'خدمات انستغرام';
      } else if (translatedName.includes('فيسبوك') || serviceData.name.toLowerCase().includes('facebook')) {
        subCategory = 'خدمات فيسبوك';
      } else if (translatedName.includes('يوتيوب') || serviceData.name.toLowerCase().includes('youtube')) {
        subCategory = 'خدمات يوتيوب';
      } else if (translatedName.includes('تويتر') || serviceData.name.toLowerCase().includes('twitter')) {
        subCategory = 'خدمات تويتر';
      }
      
      let service = await Service.findOne({ apiServiceId: serviceData.service });

      if (!service) {
        service = new Service({
          apiServiceId: serviceData.service,
          name: translatedName,
          description: translatedDescription,
          category: 'زيادة التفاعل', // ✅ الفئة الرئيسية
          subCategory: subCategory, // ✅ الفئة الفرعية
          price: serviceData.rate || 0,
          min: serviceData.min || 1,
          max: serviceData.max || 1,
          type: serviceData.type || 'General',
          dripfeed: serviceData.dripfeed || false,
          refill: serviceData.refill || false,
          cancel: serviceData.cancel || false,
          stock: serviceData.stock || 0,
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
        service.type = serviceData.type || service.type;
        service.dripfeed = serviceData.dripfeed || service.dripfeed;
        service.refill = serviceData.refill || service.refill;
        service.cancel = serviceData.cancel || service.cancel;
        service.stock = serviceData.stock || service.stock;
        service.createdBy = adminUser._id;
      }

      await service.save();
      savedServices.push(service);
    }

    res.status(200).json({
      message: 'Services synced successfully.',
      servicesCount: savedServices.length,
      services: savedServices
    });

  } catch (error) {
    console.error('Error syncing services from external API:', error.response ? error.response.data : error.message);
    res.status(error.response?.status || 500).json({
      message: 'Failed to sync services from external API.',
      error: error.response?.data || error.message
    });
  }
});

// ==========================
// تصدير جميع الدوال
module.exports = {
  getServices,
  getApiService,
  updateService,
  createService,
  deleteService,
  getServiceById,
  syncApiServices
};