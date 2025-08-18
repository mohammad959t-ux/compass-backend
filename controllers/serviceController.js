const asyncHandler = require('express-async-handler');
const axios = require('axios');
const Service = require('../models/Service');
const User = require('../models/User');
const path = require('path');
const { URLSearchParams } = require('url');

// إنشاء خدمة جديدة
const createService = asyncHandler(async (req, res) => {
    const { name, description, category, apiServiceId, isActive } = req.body;

    if (!name || !description || !category || !apiServiceId) {
        res.status(400);
        throw new Error('Please fill all required fields');
    }

    const serviceExists = await Service.findOne({ apiServiceId });
    if (serviceExists) {
        res.status(400);
        throw new Error('Service with this API service ID already exists');
    }

    let imageUrl = '';
    if (req.file) imageUrl = `/uploads/${req.file.filename}`;

    const serviceData = {
        name,
        description,
        category,
        apiServiceId,
        createdBy: req.user.id,
        isActive: isActive !== undefined ? isActive : true,
        imageUrl,
    };

    ['price', 'costPrice', 'stock'].forEach(field => {
        if (req.body[field] !== undefined && req.body[field] !== '') {
            serviceData[field] = req.body[field];
        }
    });

    const service = await Service.create(serviceData);
    res.status(201).json(service);
});

// جلب كل الخدمات (للمستخدم العادي)
const getServices = asyncHandler(async (req, res) => {
    const services = await Service.find({ isActive: true });
    res.status(200).json(services);
});

// جلب خدمة واحدة
const getServiceById = asyncHandler(async (req, res) => {
    const service = await Service.findById(req.params.id);
    if (!service || !service.isActive) {
        res.status(404);
        throw new Error('Service not found');
    }
    res.status(200).json(service);
});

// تحديث خدمة (Admin فقط)
const updateService = asyncHandler(async (req, res) => {
    const service = await Service.findById(req.params.id);
    if (!service) {
        res.status(404);
        throw new Error('Service not found');
    }

    if (req.file) req.body.imageUrl = `/uploads/${req.file.filename}`;

    const updateData = { ...req.body };
    ['price', 'costPrice', 'stock'].forEach(field => {
        if (updateData[field] === '' || updateData[field] === undefined) delete updateData[field];
    });

    const updatedService = await Service.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.status(200).json(updatedService);
});

// حذف خدمة (Admin فقط)
const deleteService = asyncHandler(async (req, res) => {
    const service = await Service.findById(req.params.id);
    if (!service) {
        res.status(404);
        throw new Error('Service not found');
    }
    await service.deleteOne();
    res.status(200).json({ id: req.params.id });
});

// جلب الخدمات من API خارجي (للمستخدم العادي)
const getApiServices = asyncHandler(async (req, res) => {
    try {
        const params = new URLSearchParams({
            key: process.env.METJAR_API_KEY,
            action: 'services',
        });
        const response = await axios.post(
            process.env.METJAR_API_URL,
            params.toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch services from external API.' });
    }
});

// استيراد خدمات من API خارجي (Admin فقط)
const importApiServices = asyncHandler(async (req, res) => {
    try {
        const params = new URLSearchParams({
            key: process.env.METJAR_API_KEY,
            action: 'services',
        });
        const response = await axios.post(
            process.env.METJAR_API_URL,
            params.toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );
        const servicesData = response.data;
        let importedCount = 0;

        for (const apiService of servicesData) {
            if (apiService.type === 'Package') {
                const packageName = apiService.name.split(' - ')[0];
                const existingPackage = await Service.findOne({ name: packageName });

                const plan = {
                    name: apiService.name.split(' - ').slice(1).join(' - '),
                    price: parseFloat(((apiService.rate / 1000) * 1.2).toFixed(4)),
                    costPrice: parseFloat((apiService.rate / 1000).toFixed(4)),
                    apiServiceId: apiService.service,
                    quantity: apiService.min,
                };

                if (existingPackage) {
                    existingPackage.plans.push(plan);
                    await existingPackage.save();
                } else {
                    const newService = new Service({
                        name: packageName,
                        description: apiService.category,
                        category: apiService.category,
                        plans: [plan],
                        createdBy: req.user.id,
                    });
                    if (apiService.min) newService.stock = apiService.min;
                    await newService.save();
                    importedCount++;
                }
            } else {
                const existingService = await Service.findOne({ apiServiceId: apiService.service });
                if (!existingService) {
                    const newService = new Service({
                        name: apiService.name,
                        description: apiService.type,
                        category: apiService.category,
                        apiServiceId: apiService.service,
                        createdBy: req.user.id,
                    });
                    if (apiService.rate) {
                        newService.price = parseFloat(((apiService.rate / 1000) * 1.2).toFixed(4));
                        newService.costPrice = parseFloat((apiService.rate / 1000).toFixed(4));
                    }
                    await newService.save();
                    importedCount++;
                }
            }
        }
        res.status(200).json({ message: `${importedCount} services imported successfully.`, importedServices: servicesData });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to import services from external API.', error: error.message });
    }
});

module.exports = {
    createService,
    getServices,
    getServiceById,
    updateService,
    deleteService,
    getApiServices,
    importApiServices,
};