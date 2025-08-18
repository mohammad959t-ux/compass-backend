const asyncHandler = require('express-async-handler');
const axios = require('axios');
const Service = require('../models/Service');
const User = require('../models/User');

// جلب الخدمات من قاعدة البيانات (للمستخدم العادي)
const getServices = asyncHandler(async (req, res) => {
  const services = await Service.find({ isVisible: true });
  res.json(services);
});

// جلب الخدمات من API خارجي (للمدير فقط)
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

// تحديث خدمة (للمدير فقط)
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

// إنشاء خدمة جديدة (للمدير فقط)
const createService = asyncHandler(async (req, res) => {
  const service = new Service({
    ...req.body,
    createdBy: req.user._id
  });
  await service.save();
  res.status(201).json(service);
});

// حذف خدمة (للمدير فقط)
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

// جلب خدمة محددة
const getServiceById = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) {
    res.status(404);
    throw new Error('Service not found.');
  }
  res.json(service);
});

// مزامنة الخدمات من API الخارجي (للمدير فقط)
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

    const savedServices = [];
    for (const serviceData of externalServices) {
      let service = await Service.findOne({ apiServiceId: serviceData.service });

      if (!service) {
        service = new Service({
          apiServiceId: serviceData.service,
          name: serviceData.name || 'No Name',
          description: serviceData.description || 'No description',
          category: serviceData.category_name || 'API Service',
          price: serviceData.rate || 0,
          min: serviceData.min || 0,
          max: serviceData.max || 0,
          type: serviceData.type || 'Other',
          dripfeed: serviceData.dripfeed || false,
          refill: serviceData.refill || false,
          cancel: serviceData.cancel || false,
          imageUrl: null,
          stock: 0,
          createdBy: req.user ? req.user._id : null,
          isVisible: true
        });
      } else {
        service.name = serviceData.name || service.name;
        service.description = serviceData.description || service.description;
        service.category = serviceData.category_name || service.category;
        service.price = serviceData.rate || service.price;
        service.min = serviceData.min || service.min;
        service.max = serviceData.max || service.max;
        service.type = serviceData.type || service.type;
        service.dripfeed = serviceData.dripfeed ?? service.dripfeed;
        service.refill = serviceData.refill ?? service.refill;
        service.cancel = serviceData.cancel ?? service.cancel;
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
    console.error('Error syncing services from external API:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      message: 'Failed to sync services from external API.',
      error: error.response?.data || error.message
    });
  }
});

module.exports = {
  getServices,
  getApiService,
  updateService,
  createService,
  deleteService,
  getServiceById,
  syncApiServices
};
