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

  // السعر النهائي يعتمد على السعر المخزن بالفعل مع الهامش
  const finalUnitPrice = service.price; // السعر للمستخدم
  const totalCost = (quantity / 1000) * finalUnitPrice; // لكل 1000 وحدة إذا كانت الخدمة SMM

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
    price: service.unitPrice,   // السعر الأساسي لكل وحدة / 1000
    costPrice: service.costPrice,
    totalCost,                  // السعر النهائي للمستخدم
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

  const service = await Service.findById(serviceId);

  const totalCost = service ? (quantity / 1000) * service.price : 0;

  const order = await Order.create({
    user: userId,
    serviceId,
    quantity,
    link,
    status,
    price: service ? service.unitPrice : 0,
    costPrice: service ? service.costPrice : 0,
    totalCost,
    walletDeduction: totalCost
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
