const asyncHandler = require('express-async-handler');
const axios = require('axios');
const Order = require('../models/Order');
const Service = require('../models/Service');
const User = require('../models/User');

// إنشاء طلب جديد من التطبيق (للمستخدم العادي)
const createOrder = asyncHandler(async (req, res) => {
  const { serviceId, link, quantity, planId, customPrice } = req.body;

  if (!serviceId) {
    res.status(400);
    throw new Error('Service ID is required.');
  }

  const service = await Service.findById(serviceId);
  const user = await User.findById(req.user._id);

  if (!service || !user) {
    res.status(404);
    throw new Error('Service or user not found');
  }

  let orderPrice;
  let orderCostPrice = service.costPrice || 0;
  let orderQuantity = quantity || 1;
  let orderApiServiceId = service.apiServiceId || null;

  // حساب السعر حسب الخطة أو الخدمة أو customPrice
  if (planId) {
    const plan = service.plans.id(planId);
    if (!plan) {
      res.status(404);
      throw new Error('Plan not found.');
    }
    orderPrice = plan.price;
    orderCostPrice = plan.costPrice;
    orderQuantity = plan.quantity || quantity;
    orderApiServiceId = plan.apiServiceId;
  } else if (service.category === 'Design' && customPrice) {
    orderPrice = parseFloat(customPrice);
  } else {
    orderPrice = service.price;
    if (orderQuantity > service.stock) {
      res.status(400);
      throw new Error('Not enough stock for this service.');
    }
    service.stock -= orderQuantity;
    await service.save();
  }

  const totalPriceUSD = orderPrice * orderQuantity;

  if (user.balance < totalPriceUSD) {
    res.status(400);
    throw new Error(`Insufficient balance. You need ${totalPriceUSD} USD.`);
  }

  user.balance -= totalPriceUSD;
  await user.save();

  let externalOrderId = null;
  if (orderApiServiceId && link) {
    try {
      const response = await axios.post(process.env.METJAR_API_URL, {
        key: process.env.METJAR_API_KEY,
        action: 'add',
        service: orderApiServiceId,
        link,
        quantity: orderQuantity,
      });
      externalOrderId = response.data.order;
    } catch (error) {
      user.balance += totalPriceUSD;
      await user.save();
      if (!planId) {
        service.stock += orderQuantity;
        await service.save();
      }
      console.error('External API Error:', error.response ? error.response.data : error.message);
      res.status(error.response?.status || 500).json({
        message: 'Failed to create order with external API. Balance refunded.',
        error: error.response?.data
      });
      return;
    }
  }

  const order = await Order.create({
    user: req.user._id,
    serviceId: service._id,
    apiOrderId: externalOrderId,
    link: link || null,
    quantity: orderQuantity,
    price: orderPrice,
    costPrice: orderCostPrice,
    planId: planId || null,
    customPrice: customPrice || null,
    currency: 'USD',
    exchangeRate: 1,
    amountPaid: totalPriceUSD,
    walletDeduction: totalPriceUSD,
    expectedCompletion: new Date(Date.now() + 24*60*60*1000),
    status: 'Pending',
  });

  res.status(201).json(order);
});

// تحديث حالة الطلب (Admin فقط)
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const order = await Order.findById(id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  order.status = status;
  await order.save();

  res.json({ message: `Order status updated to ${status}`, order });
});

// إضافة طلب يدوي (Admin)
const createOrderManual = asyncHandler(async (req, res) => {
  const { userId, serviceId, quantity, customPrice, expectedCompletion, clientName, clientPhone, description } = req.body;

  if (!quantity) {
    res.status(400);
    throw new Error('Quantity is required.');
  }

  let user = null;
  let service = null;
  let price = customPrice || 0;

  if (userId) {
    user = await User.findById(userId);
    if (!user) {
      res.status(404);
      throw new Error('User not found.');
    }
  }

  if (serviceId) {
    service = await Service.findById(serviceId);
    if (!service) {
      res.status(404);
      throw new Error('Service not found.');
    }
    price = customPrice || service.price;
  }

  const totalPriceUSD = price * quantity;

  if (user && user.balance < totalPriceUSD) {
    res.status(400);
    throw new Error('User has insufficient balance.');
  }

  if (user) {
    user.balance -= totalPriceUSD;
    await user.save();
  }

  const orderData = {
    user: user?._id || null,
    serviceId: service?._id || null,
    quantity,
    price,
    amountPaid: totalPriceUSD,
    walletDeduction: user ? totalPriceUSD : 0,
    expectedCompletion: expectedCompletion ? new Date(expectedCompletion) : new Date(Date.now() + 24*60*60*1000),
    status: 'Pending',
    clientName: clientName || null,
    clientPhone: clientPhone || null,
    description: description || null,
  };

  const order = await Order.create(orderData);
  res.status(201).json(order);
});

module.exports = {
  createOrder,
  getUserOrders: asyncHandler(async (req, res) => {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).populate('serviceId');
    res.json(orders);
  }),
  getOrdersForAdmin: asyncHandler(async (req, res) => {
    const orders = await Order.find().sort({ createdAt: -1 }).populate('serviceId').populate('user');
    res.json(orders);
  }),
  getRecentOrders: asyncHandler(async (req, res) => {
    const orders = await Order.find().sort({ createdAt: -1 }).populate('serviceId').populate('user');
    res.json(orders.slice(0, 10));
  }),
  updateOrderStatus,
  createOrderManual,
};
