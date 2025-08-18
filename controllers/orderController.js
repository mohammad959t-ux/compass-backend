const asyncHandler = require('express-async-handler');
const axios = require('axios');
const Order = require('../models/Order');
const Service = require('../models/Service');
const User = require('../models/User');

// --- إنشاء طلب جديد ---
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

  let orderPrice, orderCostPrice = service.costPrice || 0, orderQuantity = quantity || 1, orderApiServiceId = service.apiServiceId || null;

  // حساب السعر حسب الخطة أو الخدمة أو customPrice
  if (planId) {
    const plan = service.plans.id(planId);
    if (!plan) throw new Error('Plan not found.');
    orderPrice = plan.price;
    orderCostPrice = plan.costPrice;
    orderQuantity = plan.quantity || quantity;
    orderApiServiceId = plan.apiServiceId;
  } else if (customPrice) {
    orderPrice = parseFloat(customPrice);
  } else {
    orderPrice = service.price;
    if (orderQuantity > service.stock) throw new Error('Not enough stock for this service.');
    service.stock -= orderQuantity;
    await service.save();
  }

  const totalPriceUSD = orderPrice * orderQuantity;
  if (user.balance < totalPriceUSD) throw new Error(`Insufficient balance. You need ${totalPriceUSD} USD.`);

  user.balance -= totalPriceUSD;
  await user.save();

  let externalOrderId = null;
  if (orderApiServiceId && link) {
    try {
      const response = await axios.post(process.env.SMM_API_URL, {
        key: process.env.SMM_API_KEY,
        action: 'add',
        service: orderApiServiceId,
        link,
        quantity: orderQuantity
      });
      externalOrderId = response.data.order;
    } catch (error) {
      user.balance += totalPriceUSD;
      await user.save();
      if (!planId) {
        service.stock += orderQuantity;
        await service.save();
      }
      return res.status(error.response?.status || 500).json({
        message: 'Failed to create order with external API. Balance refunded.',
        error: error.response?.data || error.message
      });
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

// --- دالة لفحص الطلبات ---
const checkAndProcessOrder = async (order) => {
  try {
    const ONE_DAY = 24 * 60 * 60 * 1000;
    if (order.status === 'Pending' && Date.now() - new Date(order.createdAt).getTime() > ONE_DAY) {
      order.status = 'Failed';
      await order.save();
      console.log(`⚠️ Order ${order._id} marked as Failed (stuck Pending > 24h).`);
      return;
    }

    if (order.apiOrderId) {
      const response = await axios.post(process.env.SMM_API_URL, {
        key: process.env.SMM_API_KEY,
        action: 'status',
        order: order.apiOrderId,
      });

      if (response.data && response.data.status) {
        const apiStatus = response.data.status;
        order.status = apiStatus === 'Completed' ? 'Completed'
                      : apiStatus === 'In progress' ? 'In Progress'
                      : apiStatus === 'Pending' ? 'Pending'
                      : apiStatus === 'Processing' ? 'Processing'
                      : apiStatus === 'Partial' ? 'Partial'
                      : apiStatus === 'Canceled' ? 'Canceled'
                      : order.status;

        await order.save();
        console.log(`✅ Order ${order._id} updated to: ${order.status}`);
      }
    } else {
      console.log(`ℹ️ Order ${order._id} is manual. Skipping API check.`);
    }
  } catch (error) {
    console.error(`❌ Error processing order ${order._id}:`, error.message);
  }
};

// --- دوال إضافية ---
module.exports = {
  createOrder,
  checkAndProcessOrder,
  getUserOrders: asyncHandler(async (req, res) => {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).populate('serviceId');
    res.json(orders);
  }),
  getOrdersForAdmin: asyncHandler(async (req, res) => {
    const orders = await Order.find().sort({ createdAt: -1 }).populate('serviceId').populate('user');
    res.json(orders);
  }),
  updateOrderStatus: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const order = await Order.findById(id);
    if (!order) throw new Error('Order not found');
    order.status = status;
    await order.save();
    res.json({ message: `Order status updated to ${status}`, order });
  }),
  createOrderManual: asyncHandler(async (req, res) => {
    const { userId, serviceId, quantity, customPrice, expectedCompletion, clientName, clientPhone, description } = req.body;
    const user = userId ? await User.findById(userId) : null;
    const service = serviceId ? await Service.findById(serviceId) : null;
    const price = customPrice || (service ? service.price : 0);
    const totalPriceUSD = price * quantity;

    if (user && user.balance < totalPriceUSD) throw new Error('User has insufficient balance.');
    if (user) { user.balance -= totalPriceUSD; await user.save(); }

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
  }),
};
