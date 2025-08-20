const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const Service = require('../models/Service');
const User = require('../models/User');

// ==========================
// إنشاء طلب جديد (User)
const createOrder = asyncHandler(async (req, res) => {
  const { serviceId, quantity, link } = req.body;
  const user = req.user;

  if (!serviceId || !quantity || !link) {
    res.status(400);
    throw new Error('Please add all fields');
  }

  const service = await Service.findById(serviceId);
  if (!service) {
    res.status(404);
    throw new Error('Service not found');
  }

  // حساب السعر النهائي مع هامش ربح 20%
  const profitMargin = 0.2;
  const finalUnitPrice = service.price * (1 + profitMargin);
  const totalCost = quantity * finalUnitPrice;

  if (user.balance < totalCost) {
    res.status(400);
    throw new Error('Insufficient balance');
  }

  // إنشاء الطلب
  const order = await Order.create({
    user: user._id,
    serviceId: serviceId,
    quantity,
    link,
    price: service.price,       // السعر الأساسي
    costPrice: service.price,   // السعر الأساسي
    totalCost,                  // السعر النهائي بعد الهامش
    walletDeduction: totalCost, // الخصم من المحفظة
    status: 'Pending',
  });

  // خصم الرصيد من المحفظة
  user.balance -= totalCost;
  await user.save();

  res.status(201).json({
    message: 'Order created successfully',
    order,
  });
});

// ==========================
// جلب طلبات المستخدم
const getUserOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user.id }).populate('serviceId', 'name price');
  res.status(200).json(orders);
});

// ==========================
// جلب جميع الطلبات (Admin)
const getOrdersForAdmin = asyncHandler(async (req, res) => {
  const orders = await Order.find({})
    .populate('user', 'name email')
    .populate('serviceId', 'name');
  res.status(200).json(orders);
});

// ==========================
// جلب آخر 10 طلبات (Admin)
const getRecentOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({})
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('user', 'name')
    .populate('serviceId', 'name');
  res.status(200).json(orders);
});

// ==========================
// تحديث حالة الطلب (Admin)
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  order.status = status;
  await order.save();
  res.status(200).json({ message: 'Order status updated successfully' });
});

// ==========================
// إنشاء طلب يدوي (Admin)
const createOrderManual = asyncHandler(async (req, res) => {
  const { userId, serviceId, quantity, link, status } = req.body;
  const order = await Order.create({
    user: userId,
    serviceId,
    quantity,
    link,
    status,
    price: 0,
    costPrice: 0,
    totalCost: 0,
    walletDeduction: 0
  });
  res.status(201).json({
    message: 'Manual order created successfully',
    order,
  });
});

// ==========================
// تحقق من حالة الطلبات (Cron Job / Automatic)
const checkOrderStatuses = asyncHandler(async (req, res) => {
  res.status(200).json({ message: 'Order status check triggered successfully' });
});

module.exports = {
  createOrder,
  getUserOrders,
  getOrdersForAdmin,
  getRecentOrders,
  updateOrderStatus,
  createOrderManual,
  checkOrderStatuses
};
