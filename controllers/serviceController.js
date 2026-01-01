const asyncHandler = require('express-async-handler');
const axios = require('axios');
const Service = require('../models/Service');
const User = require('../models/User');
const { uploadImageToCloud, deleteImageFromCloud } = require('../utils/cloudinary');

// ---------------------------------------------
// ط¥ط¹ط¯ط§ط¯ط§طھ ط¹ط§ظ…ط©
// ---------------------------------------------
const PROFIT_MARGIN = 0.40;
const MIN_FINAL_PRICE = 0.005;
const MAX_BASE_RATE = Number(process.env.MAX_BASE_RATE ?? 100);
const MAX_MIN_QUANTITY = Number(process.env.MAX_MIN_QUANTITY ?? 10000);

// ---------------------------------------------
// ط¯ظˆط§ظ„ ظ…ط³ط§ط¹ط¯ط©
// ---------------------------------------------
const getSubCategory = (nameRaw = '', descRaw = '') => {
  const text = (nameRaw + ' ' + descRaw).toLowerCase();
  if (text.includes('instagram') || text.includes('ط§ظ†ط³طھط؛ط±ط§ظ…')) return 'ط§ظ†ط³طھط؛ط±ط§ظ…';
  if (text.includes('tiktok') || text.includes('طھظٹظƒ طھظˆظƒ') || text.includes('طھظٹظƒطھظˆظƒ')) return 'طھظٹظƒ طھظˆظƒ';
  if (text.includes('youtube') || text.includes('ظٹظˆطھظٹظˆط¨')) return 'ظٹظˆطھظٹظˆط¨';
  if (text.includes('facebook') || text.includes('ظپظٹط³ط¨ظˆظƒ')) return 'ظپظٹط³ط¨ظˆظƒ';
  if (text.includes('twitter') || text.includes('x ') || text.endsWith(' x') || text.includes('طھظˆظٹطھط±')) return 'طھظˆظٹطھط±';
  if (text.includes('telegram') || text.includes('طھظٹظ„ظٹط¬ط±ط§ظ…') || text.includes('طھظ„ط؛ط±ط§ظ…')) return 'طھظٹظ„ظٹط¬ط±ط§ظ…';
  if (text.includes('spotify') || text.includes('ط³ط¨ظˆطھظٹظپط§ظٹ')) return 'ط³ط¨ظˆطھظٹظپط§ظٹ';
  if (text.includes('soundcloud') || text.includes('ط³ط§ظˆظ†ط¯ظƒظ„ط§ظˆط¯')) return 'ط³ط§ظˆظ†ط¯ظƒظ„ط§ظˆط¯';
  if (text.includes('linkedin') || text.includes('ظ„ظٹظ†ظƒط¯')) return 'ظ„ظٹظ†ظƒط¯ط¥ظ†';
  if (text.includes('website') || text.includes('traffic') || text.includes('ط²ظٹط§ط±ط§طھ')) return 'ط²ظٹط§ط±ط§طھ ظ…ظˆط§ظ‚ط¹';
  return 'ط£ط®ط±ظ‰';
};

const cleanName = (s = '') =>
  s.replace(/\s+/g, ' ').replace(/[\u26A0-\u26FF\u2700-\u27BF]/g, '').trim();

const looksBad = (name = '') =>
  /test|trial|free|dummy|beta|âڑ |â‌Œ|slow|unstable/i.test(name);

const qualityScore = (srv) => {
  let score = 0;
  if (!looksBad(srv.name)) score += 5;
  if (srv.price > 0 && srv.price <= MAX_BASE_RATE) score += 3;
  if (srv.min <= MAX_MIN_QUANTITY) score += 2;
  return score;
};

const toBool = (value) => {
  if (typeof value === 'boolean') return value;
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
};

// ---------------------------------------------
// ط¬ظ„ط¨ ط§ظ„ظپط¦ط§طھ ط§ظ„ط±ط¦ظٹط³ظٹط© ظˆط§ظ„ظپط±ط¹ظٹط©
// ---------------------------------------------
const getCategories = asyncHandler(async (req, res) => {
  try {
    const categories = await Service.aggregate([
      { $match: { isVisible: true, apiServiceId: { $exists: true, $nin: [null, ''] } } },
      { $group: { _id: '$mainCategory', subCategories: { $addToSet: '$subCategory' } } }
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
// ط¬ظ„ط¨ ط§ظ„ط®ط¯ظ…ط§طھ ظ„ظ„ظ…ط³طھط®ط¯ظ… (ظپظ„طھط±ط© ظˆظپط±ط² ظ…ط­ط³ظ‘ظ†)
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

    const sort = {};
    if (sortBy === 'pricePerQuantity') sort.pricePerUnit = sortDir;
    else if (sortBy === 'price') sort.price = sortDir;
    else if (sortBy === 'name') sort.name = sortDir;
    else if (sortBy === 'qualityScore') sort.qualityScore = sortDir;
    else sort.mainCategory = sortDir;

    const query = { isVisible: true, price: { $gt: 0 }, apiServiceId: { $exists: true, $nin: [null, ''] } };
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
    if (mainCategory) query.mainCategory = { $regex: new RegExp(mainCategory, 'i') };
    if (subCategory) query.subCategory = subCategory;

    if (!isNaN(minPrice) && minPrice > 0) {
      query.price.$gte = minPrice;
    }
    if (!isNaN(maxPrice) && maxPrice > 0) {
      query.price.$lte = maxPrice;
    }

    const [items, total] = await Promise.all([
      Service.find(query)
        .select('name description mainCategory subCategory price min max imageUrl qualityScore pricePerUnit priceForMinQuantity priceForMaxQuantity pricingModel')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Service.countDocuments(query)
    ]);

    res.json({ total, page, pages: Math.ceil(total / limit), limit, items });
  } catch (err) {
    console.error('Error in getServices:', err);
    res.status(500).json({ message: 'Failed to fetch services', error: err.message });
  }
});

// ---------------------------------------------
// ط¬ظ„ط¨ ط®ط¯ظ…ط© ظˆط§ط­ط¯ط© ظˆطھط­ط¯ظٹط« ط³ط¹ط±ظ‡ط§ ط¨ظ†ط§ط،ظ‹ ط¹ظ„ظ‰ ط§ظ„ظƒظ…ظٹط©
// ---------------------------------------------
const getServiceById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  let userQuantity = Number(req.query.quantity) || 1000;

  const service = await Service.findById(id).lean();
  if (!service || !service.apiServiceId || service.price <= 0) {
    res.status(404);
    throw new Error('Service not found'); 
  }

  let finalPrice;
  if (service.pricingModel === 'fixed') {
    finalPrice = service.price;
    userQuantity = 1; // ط®ط¯ظ…ط© ط«ط§ط¨طھط© ظ„ط§ طھط¹طھظ…ط¯ ط¹ظ„ظ‰ ظƒظ…ظٹط©
  } else {
    finalPrice = Number((service.price * (userQuantity / 1000)).toFixed(4));
    if (finalPrice < MIN_FINAL_PRICE) finalPrice = MIN_FINAL_PRICE;
  }

  res.json({ ...service, price: finalPrice, quantity: userQuantity });
});

// ---------------------------------------------
// ظ…ط²ط§ظ…ظ†ط© ط§ظ„ط®ط¯ظ…ط§طھ (ظ…ط­ط³ظ‘ظ†)
// ---------------------------------------------
const syncServicesTask = async () => {
  const response = await axios.post(process.env.METJAR_API_URL, { key: process.env.METJAR_API_KEY, action: 'services' }, { timeout: 120000 });
  const externalServices = response.data;
  if (!Array.isArray(externalServices)) {
    throw new Error('External API did not return a list.');
  }

  const adminUser = await User.findOne({ isAdmin: true }).lean();
  if (!adminUser) {
    throw new Error('No admin found.');
  }

  const apiIds = externalServices
    .map((srv) => String(srv.service || '').trim())
    .filter(Boolean);

  const overrideDocs = await Service.find({
    apiServiceId: { $in: apiIds },
    manualOverride: true,
  }).select('apiServiceId').lean();
  const overrideSet = new Set(overrideDocs.map((doc) => String(doc.apiServiceId)));

  const ops = [];
  let kept = 0;
  let skipped = 0;

  for (const srv of externalServices) {
    const apiServiceId = srv.service;
    const baseRate = Number(srv.rate ?? 0);
    const min = Number(srv.min ?? 1);
    const max = Number(srv.max ?? 1);
    const apiCategory = typeof srv.category === 'string' ? srv.category.trim() : '';
    const apiType = typeof srv.type === 'string' ? srv.type.trim() : '';
    const apiRefill = toBool(srv.refill);
    const apiCancel = toBool(srv.cancel);
    const apiDripfeed = toBool(srv.dripfeed);
    let rawName = cleanName(srv.name || '');
    let rawDesc = srv.description || '';

    if (!apiServiceId || !rawName || looksBad(rawName) || baseRate <= 0 || baseRate > MAX_BASE_RATE || min > MAX_MIN_QUANTITY) { skipped++; continue; }

    let translatedName = rawName;
    let translatedDesc = rawDesc || 'No description';

    const subCategory = getSubCategory(`${translatedName} ${apiCategory}`.trim(), translatedDesc);
    const mainCategory = apiCategory || 'Social Media Services';

    const finalPriceFor1000 = Number((baseRate * (1 + PROFIT_MARGIN)).toFixed(4));

    const pricePerUnit = Number((finalPriceFor1000 / 1000).toFixed(4));
    const priceForMinQuantity = Number((pricePerUnit * min).toFixed(4));
    const priceForMaxQuantity = Number((pricePerUnit * max).toFixed(4));

    const updateSet = {
      pricingModel: 'per_unit',
      costPrice: baseRate,
      price: finalPriceFor1000,
      min,
      max,
      apiCategory,
      apiType,
      apiRefill,
      apiCancel,
      apiDripfeed,
      pricePerUnit,
      priceForMinQuantity,
      priceForMaxQuantity,
      createdBy: adminUser._id,
    };

    if (!overrideSet.has(String(apiServiceId))) {
      updateSet.name = translatedName;
      updateSet.description = translatedDesc;
      updateSet.mainCategory = mainCategory;
      updateSet.subCategory = subCategory;
    }

    ops.push({
      updateOne: {
        filter: { apiServiceId },
        update: {
          $set: updateSet,
          $setOnInsert: { isVisible: true, manualOverride: false },
        },
        upsert: true,
      },
    });
    kept++;
    if (ops.length >= 1000) { await Service.bulkWrite(ops, { ordered: false }); ops.length = 0; }
  }

  if (ops.length) await Service.bulkWrite(ops, { ordered: false });

  let hidden = 0;
  if (apiIds.length) {
    const hideResult = await Service.updateMany(
      {
        apiServiceId: { $exists: true, $nin: apiIds },
        manualOverride: { $ne: true }
      },
      { $set: { isVisible: false } }
    );
    hidden = hideResult.modifiedCount ?? hideResult.nModified ?? 0;
  }

  return { importedOrUpdated: kept, skipped, hidden };
};

const syncApiServices = asyncHandler(async (req, res) => {
  try {
    const result = await syncServicesTask();
    res.status(200).json({ message: 'Services synced (bulk upsert)', ...result });
  } catch (err) {
    console.error('Error in syncApiServices:', err);
    res.status(500).json({ message: 'Failed to sync services', error: err.message });
  }
});

// ---------------------------------------------
// ط¯ظˆط§ظ„ ط§ظ„ط¥ط¯ط§ط±ط© (ط¥ظ†ط´ط§ط،/طھط­ط¯ظٹط«/ط­ط°ظپ)
// ---------------------------------------------
const createService = asyncHandler(async (req, res) => {
  res.status(403);
  throw new Error('Manual service creation disabled. Use /api/services/sync.');
  const { name, description, price, min, max, mainCategory, subCategory, pricingModel = 'per_unit' } = req.body;
  if (!name || price == null || !mainCategory || !subCategory) { res.status(400); throw new Error('Please fill all required fields'); }
  
  let costPrice = null;
  if (pricingModel === 'per_unit') {
    costPrice = Number((price / (1 + PROFIT_MARGIN)).toFixed(4));
  }

  const imageUrl = req.file ? await uploadImageToCloud(req.file) : null;

  const service = new Service({
    name: cleanName(name),
    description: description || '',
    price: Number(price),
    costPrice,
    min: pricingModel === 'per_unit' ? Number(min) : 1,
    max: pricingModel === 'per_unit' ? Number(max) : 1,
    mainCategory,
    subCategory,
    pricingModel,
    createdBy: req.user.id,
    imageUrl,
    isVisible: true
  });
  const savedService = await service.save();
  res.status(201).json(savedService);
});

const updateService = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) { res.status(404); throw new Error('Service not found'); }
  if (!req.user) { res.status(401); throw new Error('User not found'); }
  if (!service.apiServiceId) { res.status(403); throw new Error('Manual services are disabled.'); }
  if (service.createdBy.toString() !== req.user.id && !req.user.isAdmin) { res.status(401); throw new Error('User not authorized to update this service'); }

  const payload = { ...req.body };
  if (payload.name) payload.name = cleanName(payload.name);
  if (payload.price != null) {
      payload.price = Number(payload.price);
      if (service.pricingModel === 'per_unit') {
        payload.costPrice = Number((payload.price / (1 + PROFIT_MARGIN)).toFixed(4));
      }
  }
  if (payload.min != null) payload.min = Number(payload.min);
  if (payload.max != null) payload.max = Number(payload.max);
  
  if (req.file) {
    if (service.imageUrl) {
      await deleteImageFromCloud(service.imageUrl);
    }
    payload.imageUrl = await uploadImageToCloud(req.file);
  }

  const updatedService = await Service.findByIdAndUpdate(req.params.id, payload, { new: true });
  res.json(updatedService);
});

const deleteService = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) { res.status(404); throw new Error('Service not found'); }
  if (!req.user) { res.status(401); throw new Error('User not found'); }
  if (!service.apiServiceId) { res.status(403); throw new Error('Manual services are disabled.'); }
  if (service.createdBy.toString() !== req.user.id && !req.user.isAdmin) { res.status(401); throw new Error('User not authorized to delete this service'); }

  if (service.imageUrl) {
    await deleteImageFromCloud(service.imageUrl);
  }

  await service.deleteOne();
  res.json({ message: 'Service removed' });
});

const getServicesAdmin = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 50, 500);
  const skip = (page - 1) * limit;
  const search = (req.query.search || '').trim();
  const mainCategory = (req.query.mainCategory || '').trim();
  const subCategory = (req.query.subCategory || '').trim();
  const sortBy = (req.query.sortBy || 'mainCategory');
  const sortDir = (req.query.sortDir || 'asc').toLowerCase() === 'desc' ? -1 : 1;

  const query = { apiServiceId: { $exists: true, $nin: [null, ''] } };
  if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }];
  if (mainCategory) query.mainCategory = { $regex: new RegExp(mainCategory, 'i') };
  if (subCategory) query.subCategory = subCategory;

  const sort = {};
  if (sortBy === 'price') sort.price = sortDir;
  else if (sortBy === 'name') sort.name = sortDir;
  else sort.mainCategory = sortDir;

  const [items, total] = await Promise.all([
    Service.find(query).select('name description mainCategory subCategory price min max imageUrl isVisible pricePerUnit costPrice pricingModel').sort(sort).skip(skip).limit(limit).lean(),
    Service.countDocuments(query)
  ]);

  res.json({ total, page, pages: Math.ceil(total / limit), limit, items });
});

const deleteAllServices = asyncHandler(async (req, res) => {
  await Service.deleteMany({});
  res.json({ message: 'All services have been deleted successfully.' });
});

const makeAllServicesVisible = asyncHandler(async (req, res) => {
  await Service.updateMany({}, { isVisible: true });
  res.json({ message: 'All services are now visible' });
});

// ---------------------------------------------
// ط±ظپط¹ طµظˆط±ط© ط¥ظ„ظ‰ Cloudinary
// ---------------------------------------------
const uploadImage = asyncHandler(async (file) => {
  if (!file) {
    throw new Error('No file uploaded');
  }
  
  try {
    const imageUrl = await uploadImageToCloud(file);
    return imageUrl;
  } catch (error) {
    console.error('Image upload error:', error);
    throw new Error('Failed to upload image: ' + error.message);
  }
});

// ---------------------------------------------
// طھطµط¯ظٹط± ط§ظ„ط¯ظˆط§ظ„
// ---------------------------------------------
module.exports = {
  getServices,
  getServicesAdmin,
  getServiceById,
  createService,
  updateService,
  deleteService,
  deleteAllServices,
  syncApiServices,
  syncServicesTask,
  makeAllServicesVisible,
  getCategories,
  uploadImage
};



