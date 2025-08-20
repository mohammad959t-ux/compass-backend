// serviceController.js

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
const PROFIT_MARGIN = Number(process.env.PROFIT_MARGIN ?? 0.20); // هامش الربح عند العرض للمستخدم
const MAX_BASE_RATE = Number(process.env.MAX_BASE_RATE ?? 100); // استبعاد الخدمات الغالية جدًا (لكل 1000)
const MAX_MIN_QUANTITY = Number(process.env.MAX_MIN_QUANTITY ?? 10000); // استبعاد حد أدنى مبالغ
const ENABLE_TRANSLATION = (process.env.ENABLE_TRANSLATION ?? 'false').toLowerCase() === 'true'; // تفعيل/تعطيل الترجمة لتخفيف الضغط

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
// دوال مساعدة: تصنيف بالكلمات المفتاحية + تنظيف الاسم
// ---------------------------------------------
const getSubCategory = (nameRaw = '') => {
  const name = (nameRaw || '').toLowerCase();
  if (name.includes('instagram') || name.includes('انستغرام')) return 'انستغرام';
  if (name.includes('tiktok') || name.includes('تيك توك') || name.includes('تيكتوك')) return 'تيك توك';
  if (name.includes('youtube') || name.includes('يوتيوب')) return 'يوتيوب';
  if (name.includes('facebook') || name.includes('فيسبوك')) return 'فيسبوك';
  if (name.includes('twitter') || name.includes('x ' ) || name.endsWith(' x') || name.includes('تويتر')) return 'تويتر';
  if (name.includes('telegram') || name.includes('تيليجرام') || name.includes('تلغرام')) return 'تيليجرام';
  if (name.includes('spotify') || name.includes('سبوتيفاي')) return 'سبوتيفاي';
  if (name.includes('soundcloud') || name.includes('ساوندكلاود')) return 'ساوندكلاود';
  if (name.includes('linkedin') || name.includes('لينكد')) return 'لينكدإن';
  if (name.includes('website') || name.includes('traffic') || name.includes('زيارات')) return 'زيارات مواقع';
  return 'أخرى';
};

const cleanName = (s = '') =>
  s.replace(/\s+/g, ' ').replace(/[\u26A0-\u26FF\u2700-\u27BF]/g, '').trim(); // يشيل الإيموجي/الرموز التحذيرية

const looksBad = (name = '') =>
  /test|trial|free|dummy|beta|⚠|❌|slow|unstable/i.test(name);

// ---------------------------------------------
// جلب الخدمات للمستخدم (مع ترحيل + بحث + فرز)
// يطبّق هامش الربح عند الإرجاع
// ---------------------------------------------
const getServices = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 200);
  const skip = (page - 1) * limit;

  const search = (req.query.search || '').trim();
  const mainCategory = (req.query.mainCategory || '').trim();
  const subCategory = (req.query.subCategory || '').trim();
  const sortBy = (req.query.sortBy || 'mainCategory'); // price | name | mainCategory
  const sortDir = (req.query.sortDir || 'asc').toLowerCase() === 'desc' ? -1 : 1;

  const query = { isVisible: true };

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }
  if (mainCategory) query.mainCategory = mainCategory;
  if (subCategory) query.subCategory = subCategory;

  const sort = {};
  if (sortBy === 'price') sort.price = sortDir;
  else if (sortBy === 'name') sort.name = sortDir;
  else sort.mainCategory = sortDir; // default

  const [items, total] = await Promise.all([
    Service.find(query)
      .select('name description mainCategory subCategory price min max imageUrl plans')
      .populate('plans')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Service.countDocuments(query)
  ]);

  const servicesWithProfit = items.map(s => ({
    ...s,
    price: Number((Number(s.price || 0) * (1 + PROFIT_MARGIN)).toFixed(4))
  }));

  res.json({
    total,
    page,
    pages: Math.ceil(total / limit),
    limit,
    items: servicesWithProfit
  });
});

// ---------------------------------------------
// مزامنة الخدمات من مزود خارجي (Bulk Upsert) لأداء عالي
// - فلترة مسبقة
// - ترجمة اسم فقط (اختياري)
// - جعل الخدمات الجديدة مخفية isVisible:false حتى تراجعها
// - عدم تطبيق هامش الربح هنا (يطبّق عند القراءة)
// ---------------------------------------------
const syncApiServices = asyncHandler(async (req, res) => {
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

  // ملاحظة: الترجمة لكل عنصر ممكن تبطئ. نترجم الاسم فقط وبشكل متسلسل/اختياري
  for (const srv of externalServices) {
    const apiServiceId = srv.service;
    let baseRate = Number(srv.rate ?? 0);
    const min = Number(srv.min ?? 1);
    const max = Number(srv.max ?? 1);
    const rawName = cleanName(srv.name || '');
    const rawDesc = srv.description || '';

    // فلترة
    if (!apiServiceId || !rawName) { skipped++; continue; }
    if (looksBad(rawName)) { skipped++; continue; }
    if (baseRate > MAX_BASE_RATE) { skipped++; continue; }
    if (min > MAX_MIN_QUANTITY) { skipped++; continue; }

    // ترجمة الاسم فقط (اختياري)
    let nameAr = rawName;
    if (ENABLE_TRANSLATION) {
      try {
        const t = await translate(rawName, { to: 'ar' });
        nameAr = cleanName(t.text || rawName);
      } catch (e) {
        // تجاهل خطأ الترجمة
        nameAr = rawName;
      }
    }

    const subCategory = getSubCategory(nameAr);
    const mainCategory = 'زيادة التفاعل';

    // نطبّق السعر "الأساسي" كما هو من المزود (بدون ربح)
    const dbPrice = Number(baseRate || 0);

    ops.push({
      updateOne: {
        filter: { apiServiceId },
        update: {
          $set: {
            name: nameAr,
            description: rawDesc || 'لا يوجد وصف',
            mainCategory,
            subCategory,
            price: dbPrice,
            min,
            max,
            createdBy: adminUser._id
          },
          $setOnInsert: {
            isVisible: false // جديد: مخفي افتراضياً
          }
        },
        upsert: true
      }
    });

    kept++;

    // تنفيذ على دفعات لتقليل الذاكرة/الوقت
    if (ops.length >= 2000) {
      await Service.bulkWrite(ops, { ordered: false });
      ops.length = 0;
    }
  }

  if (ops.length) {
    await Service.bulkWrite(ops, { ordered: false });
  }

  res.status(200).json({
    message: 'Services synced (bulk upsert)',
    importedOrUpdated: kept,
    skipped
  });
});

// ---------------------------------------------
// جلب خدمة واحدة
// ---------------------------------------------
const getServiceById = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) {
    res.status(404);
    throw new Error('Service not found');
  }
  res.json(service);
});

// ---------------------------------------------
// إنشاء خدمة جديدة (يدوي) مع صورة اختيارية
// ---------------------------------------------
const createService = asyncHandler(async (req, res) => {
  const { name, description, price, min, max, mainCategory, subCategory } = req.body;

  if (!name || price == null || !min || !max || !mainCategory || !subCategory) {
    res.status(400);
    throw new Error('Please fill all required fields');
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
    isVisible: false // يبدأ مخفي حتى يعتمد
  });

  const savedService = await service.save();
  res.status(201).json(savedService);
});

// ---------------------------------------------
// تعديل خدمة (مع صلاحيات)
// ---------------------------------------------
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

  // نحمي isVisible إن احتجت تغييره صراحة
  const payload = { ...req.body };
  if (payload.name) payload.name = cleanName(payload.name);
  if (payload.price != null) payload.price = Number(payload.price);
  if (payload.min != null) payload.min = Number(payload.min);
  if (payload.max != null) payload.max = Number(payload.max);

  const updatedService = await Service.findByIdAndUpdate(req.params.id, payload, { new: true });
  res.json(updatedService);
});

// ---------------------------------------------
// حذف خدمة (مع صلاحيات)
// ---------------------------------------------
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

// ---------------------------------------------
// جعل كل الخدمات مرئية (حذر)
// ---------------------------------------------
const makeAllServicesVisible = asyncHandler(async (req, res) => {
  await Service.updateMany({}, { isVisible: true });
  res.json({ message: 'All services are now visible' });
});

// ---------------------------------------------
// تصدير جميع الدوال
// ---------------------------------------------
module.exports = {
  upload,
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  syncApiServices,
  makeAllServicesVisible
};
