const asyncHandler = require('express-async-handler');
const axios = require('axios');
const translate = require('@iamtraction/google-translate');
const Service = require('../models/Service');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');

// ---------------------------------------------
// إعدادات عامة
// ---------------------------------------------
const PROFIT_MARGIN = 0.40; // هامش الربح 40%
const MAX_BASE_RATE = Number(process.env.MAX_BASE_RATE ?? 100);
const MAX_MIN_QUANTITY = Number(process.env.MAX_MIN_QUANTITY ?? 10000);
const ENABLE_TRANSLATION = (process.env.ENABLE_TRANSLATION ?? 'false').toLowerCase() === 'true';

// ---------------------------------------------
// إعداد multer لتخزين الصور
// ---------------------------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage });

// ---------------------------------------------
// دوال مساعدة: تصنيف بالكلمات المفتاحية + تنظيف الاسم + تقييم جودة الخدمة
// ---------------------------------------------
const getSubCategory = (nameRaw = '', descRaw = '') => {
  const text = (nameRaw + ' ' + descRaw).toLowerCase();
  if (text.includes('instagram') || text.includes('انستغرام')) return 'انستغرام';
  if (text.includes('tiktok') || text.includes('تيك توك') || text.includes('تيكتوك')) return 'تيك توك';
  if (text.includes('youtube') || text.includes('يوتيوب')) return 'يوتيوب';
  if (text.includes('facebook') || text.includes('فيسبوك')) return 'فيسبوك';
  if (text.includes('twitter') || text.includes('x ') || text.endsWith(' x') || text.includes('تويتر')) return 'تويتر';
  if (text.includes('telegram') || text.includes('تيليجرام') || text.includes('تلغرام')) return 'تيليجرام';
  if (text.includes('spotify') || text.includes('سبوتيفاي')) return 'سبوتيفاي';
  if (text.includes('soundcloud') || text.includes('ساوندكلاود')) return 'ساوندكلاود';
  if (text.includes('linkedin') || text.includes('لينكد')) return 'لينكدإن';
  if (text.includes('website') || text.includes('traffic') || text.includes('زيارات')) return 'زيارات مواقع';
  return 'أخرى';
};

const cleanName = (s = '') =>
  s.replace(/\s+/g, ' ').replace(/[\u26A0-\u26FF\u2700-\u27BF]/g, '').trim();

const looksBad = (name = '') =>
  /test|trial|free|dummy|beta|⚠|❌|slow|unstable/i.test(name);

const qualityScore = (srv) => {
  let score = 0;
  if (!looksBad(srv.name)) score += 5;
  if (srv.price > 0 && srv.price <= MAX_BASE_RATE) score += 3;
  if (srv.min <= MAX_MIN_QUANTITY) score += 2;
  return score;
};

// ---------------------------------------------
// جلب الفئات الرئيسية والفرعية
// ---------------------------------------------
const getCategories = asyncHandler(async (req, res) => {
  try {
    const categories = await Service.aggregate([
      { $match: { isVisible: true } },
      {
        $group: {
          _id: '$mainCategory',
          subCategories: { $addToSet: '$subCategory' }
        }
      }
    ]);
    const result = {};
    categories.forEach(cat => result[cat._id] = cat.subCategories);
    res.json(result);
  } catch (err) {
    console.error('Error in getCategories:', err);
    res.status(500).json({ message: 'Failed to load categories', error: err.message });
  }
});

// ---------------------------------------------
// جلب الخدمات للمستخدم (فلترة في قاعدة البيانات)
// ---------------------------------------------
const getServices = asyncHandler(async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 200);
    const skip = (page - 1) * limit;

    const search = (req.query.search || '').trim();
    const mainCategory = (req.query.mainCategory || '').trim();
    const subCategory = (req.query.subCategory || '').trim();
    const sortBy = (req.query.sortBy || 'qualityScore');
    const sortDir = (req.query.sortDir || 'desc').toLowerCase() === 'desc' ? -1 : 1;
    const minPrice = Number(req.query.minPrice);
    const maxPrice = Number(req.query.maxPrice);

    const query = { isVisible: true };
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
    if (mainCategory) query.mainCategory = { $regex: new RegExp(mainCategory, 'i') };
    if (subCategory) query.subCategory = subCategory;

    // تطبيق فلترة السعر في استعلام قاعدة البيانات
    if (!isNaN(minPrice) || !isNaN(maxPrice)) {
      query.price = {};
      if (!isNaN(minPrice)) query.price.$gte = minPrice;
      if (!isNaN(maxPrice)) query.price.$lte = maxPrice;
    }

    const sort = {};
    if (sortBy === 'price') sort.price = sortDir;
    else if (sortBy === 'name') sort.name = sortDir;
    else sort.mainCategory = sortDir;

    const [items, total] = await Promise.all([
      Service.find(query)
        .select('name description mainCategory subCategory price min max imageUrl plans')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Service.countDocuments(query)
    ]);
    
    // حساب السعر النهائي وهامش الربح
    const servicesWithProfit = items.map(s => {
      const userQuantity = Number(req.query.quantity) || 1000;
      const basePrice = Number(s.price || 0) * (userQuantity / 1000);
      return {
        ...s,
        price: Number((basePrice * (1 + PROFIT_MARGIN)).toFixed(4)),
        quantity: userQuantity
      };
    });

    res.json({
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
      items: servicesWithProfit
    });

  } catch (err) {
    console.error('Error in getServices:', err);
    res.status(500).json({ message: 'Failed to fetch services', error: err.message });
  }
});

// ---------------------------------------------
// جلب خدمة واحدة وتحديث سعرها بناءً على الكمية
// ---------------------------------------------
const getServiceById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userQuantity = Number(req.query.quantity) || 1000;

  const service = await Service.findById(id).lean();
  if (!service) { 
    res.status(404);
    throw new Error('Service not found'); 
  }

  // حساب السعر النهائي بناءً على الكمية المطلوبة
  const basePrice = Number(service.price || 0) * (userQuantity / 1000);
  service.price = Number((basePrice * (1 + PROFIT_MARGIN)).toFixed(4));
  service.quantity = userQuantity;

  res.json(service);
});

// ---------------------------------------------
// بقية الكود يبقى نفسه
// ---------------------------------------------

const getServicesAdmin = asyncHandler(async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 500);
    const skip = (page - 1) * limit;

    const search = (req.query.search || '').trim();
    const mainCategory = (req.query.mainCategory || '').trim();
    const subCategory = (req.query.subCategory || '').trim();
    const sortBy = (req.query.sortBy || 'mainCategory');
    const sortDir = (req.query.sortDir || 'asc').toLowerCase() === 'desc' ? -1 : 1;

    const query = {};
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
    if (mainCategory) query.mainCategory = { $regex: new RegExp(mainCategory, 'i') };
    if (subCategory) query.subCategory = subCategory;

    const sort = {};
    if (sortBy === 'price') sort.price = sortDir;
    else if (sortBy === 'name') sort.name = sortDir;
    else sort.mainCategory = sortDir;

    const [items, total] = await Promise.all([
      Service.find(query)
        .select('name description mainCategory subCategory price min max imageUrl plans isVisible')
        .populate('plans')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Service.countDocuments(query)
    ]);

    res.json({
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
      items
    });
  } catch (err) {
    console.error('Error in getServicesAdmin:', err);
    res.status(500).json({ message: 'Failed to fetch admin services', error: err.message });
  }
});

const deleteAllServices = asyncHandler(async (req, res) => {
  try {
    await Service.deleteMany({});
    res.json({ message: 'All services have been deleted successfully.' });
  } catch (err) {
    console.error('Error in deleteAllServices:', err);
    res.status(500).json({ message: 'Failed to delete all services', error: err.message });
  }
});

const syncApiServices = asyncHandler(async (req, res) => {
  try {
    const response = await axios.post(process.env.METJAR_API_URL, {
      key: process.env.METJAR_API_KEY,
      action: 'services'
    }, { timeout: 120000 });

    const externalServices = response.data;
    if (!Array.isArray(externalServices)) {
      return res.status(500).json({ message: 'External API did not return a list.' });
    }

    const adminUser = await User.findOne({ isAdmin: true }).lean();
    if (!adminUser) return res.status(500).json({ message: 'No admin found.' });

    const ops = [];
    let kept = 0, skipped = 0;

    for (const srv of externalServices) {
      const apiServiceId = srv.service;
      let baseRate = Number(srv.rate ?? 0);
      const min = Number(srv.min ?? 1);
      const max = Number(srv.max ?? 1);
      let rawName = cleanName(srv.name || '');
      let rawDesc = srv.description || '';

      if (!apiServiceId || !rawName) { skipped++; continue; }
      if (looksBad(rawName)) { skipped++; continue; }
      if (baseRate <= 0 || baseRate > MAX_BASE_RATE) { skipped++; continue; }
      if (min > MAX_MIN_QUANTITY) { skipped++; continue; }

      if (ENABLE_TRANSLATION) {
        try {
          const tName = await translate(rawName, { to: 'ar' });
          rawName = cleanName(tName.text || rawName);
          const tDesc = await translate(rawDesc, { to: 'ar' });
          rawDesc = cleanName(tDesc.text || rawDesc);
        } catch {}
      }

      const subCategory = getSubCategory(rawName, rawDesc);
      const mainCategory = 'متجر السوشيال ميديا';
      const dbPrice = Number(baseRate || 0);

      ops.push({
        updateOne: {
          filter: { apiServiceId },
          update: {
            $set: {
              price: dbPrice,
              name: rawName,
              description: rawDesc || 'لا يوجد وصف',
              mainCategory,
              subCategory,
              min,
              max,
              createdBy: adminUser._id
            },
            $setOnInsert: { isVisible: true }
          },
          upsert: true
        }
      });

      kept++;
      if (ops.length >= 1000) {
        await Service.bulkWrite(ops, { ordered: false });
        ops.length = 0;
      }
    }

    if (ops.length) await Service.bulkWrite(ops, { ordered: false });

    res.status(200).json({
      message: 'Services synced (bulk upsert)',
      importedOrUpdated: kept,
      skipped
    });
  } catch (err) {
    console.error('Error in syncApiServices:', err);
    res.status(500).json({ message: 'Failed to sync services', error: err.message });
  }
});

const createService = asyncHandler(async (req, res) => {
  const { name, description, price, min, max, mainCategory, subCategory } = req.body;

  if (!name || price == null || !min || !max || !mainCategory || !subCategory) {
    res.status(400); throw new Error('Please fill all required fields');
  }

  const service = new Service({
    name: cleanName(name),
    description: description || '',
    price: Number(price),
    min: Number(min),
    max: Number(max),
    mainCategory,
    subCategory,
    createdBy: req.user.id,
    imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
    isVisible: true
  });

  const savedService = await service.save();
  res.status(201).json(savedService);
});

const updateService = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) { res.status(404); throw new Error('Service not found'); }
  if (!req.user) { res.status(401); throw new Error('User not found'); }
  if (service.createdBy.toString() !== req.user.id && !req.user.isAdmin) {
    res.status(401); throw new Error('User not authorized to update this service');
  }

  const payload = { ...req.body };
  if (payload.name) payload.name = cleanName(payload.name);
  if (payload.price != null) payload.price = Number(payload.price);
  if (payload.min != null) payload.min = Number(payload.min);
  if (payload.max != null) payload.max = Number(payload.max);

  const updatedService = await Service.findByIdAndUpdate(req.params.id, payload, { new: true });
  res.json(updatedService);
});

const deleteService = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) { res.status(404); throw new Error('Service not found'); }
  if (!req.user) { res.status(401); throw new Error('User not found'); }
  if (service.createdBy.toString() !== req.user.id && !req.user.isAdmin) {
    res.status(401); throw new Error('User not authorized to delete this service');
  }

  await service.deleteOne();
  res.json({ message: 'Service removed' });
});

const makeAllServicesVisible = asyncHandler(async (req, res) => {
  await Service.updateMany({}, { isVisible: true });
  res.json({ message: 'All services are now visible' });
});

// ---------------------------------------------
// تصدير الدوال
// ---------------------------------------------
module.exports = {
  upload,
  getServices,
  getServicesAdmin,
  getServiceById,
  createService,
  updateService,
  deleteService,
  deleteAllServices,
  syncApiServices,
  makeAllServicesVisible,
  getCategories
};