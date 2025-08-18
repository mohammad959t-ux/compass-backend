// lib/controllers/serviceController.js

const asyncHandler = require('express-async-handler');
const axios = require('axios');
const Service = require('../models/Service');
const User = require('../models/User');

// دالة جديدة لمزامنة الخدمات من API الخارجي (للمدير فقط)
const syncApiServices = asyncHandler(async (req, res) => {
  try {
    const response = await axios.post(process.env.METJAR_API_URL, {
      key: process.env.METJAR_API_KEY,
      action: 'services' // هذا المسار يجلب جميع الخدمات المتاحة
    });

    const externalServices = response.data;

    // التأكد من أن البيانات هي قائمة خدمات
    if (!Array.isArray(externalServices)) {
      return res.status(500).json({ message: 'External API did not return a list of services.' });
    }

    const savedServices = [];
    for (const serviceData of externalServices) {
      // قم بالبحث عن الخدمة بناءً على 'service' id في API
      let service = await Service.findOne({ apiServiceId: serviceData.service });

      // إذا لم تكن الخدمة موجودة، قم بإنشاء واحدة جديدة
      if (!service) {
        service = new Service({
          apiServiceId: serviceData.service,
          name: serviceData.name,
          description: serviceData.description,
          category: serviceData.category_name,
          price: serviceData.rate,
          min: serviceData.min,
          max: serviceData.max,
          type: serviceData.type,
          dripfeed: serviceData.dripfeed,
          refill: serviceData.refill,
          cancel: serviceData.cancel,
          imageUrl: 'https://placehold.co/600x400/CCCCCC/000000?text=Social+Media',
          stock: null, // لا يوجد 'stock' في API الخارجي
          isVisible: true
        });
      } else {
        // إذا كانت الخدمة موجودة، قم بتحديث بياناتها
        service.name = serviceData.name;
        service.description = serviceData.description;
        service.category = serviceData.category_name;
        service.price = serviceData.rate;
        service.min = serviceData.min;
        service.max = serviceData.max;
        service.type = serviceData.type;
        service.dripfeed = serviceData.dripfeed;
        service.refill = serviceData.refill;
        service.cancel = serviceData.cancel;
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

// تأكد من تصدير الدالة الجديدة
module.exports = {
  // ... الدوال الأخرى
  syncApiServices
};