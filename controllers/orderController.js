// lib/controllers/orderController.js
const asyncHandler = require('express-async-handler');
const Order = require('../models/orderModel');
const Service = require('../models/serviceModel');
const User = require('../models/userModel');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private (User)
const createOrder = asyncHandler(async (req, res) => {
  const { serviceId, quantity, link } = req.body;
  const user = req.user;

  if (!serviceId || !quantity || !link) {
    res.status(400);
    throw new Error('Please add all fields');
  }

  // Get service details to calculate price
  const service = await Service.findById(serviceId);
  if (!service) {
    res.status(404);
    throw new Error('Service not found');
  }

  const totalCost = quantity * service.price;

  // Check if user has enough balance
  if (user.balance < totalCost) {
    res.status(400);
    throw new Error('Insufficient balance');
  }

  // Create order
  const order = await Order.create({
    user: user._id,
    service: serviceId,
    quantity,
    link,
    totalCost,
    status: 'Pending',
  });

  // Deduct cost from user balance
  user.balance -= totalCost;
  await user.save();

  res.status(201).json({
    message: 'Order created successfully',
    order,
  });
});

// @desc    Get user orders
// @route   GET /api/orders/myorders
// @access  Private (User)
const getUserOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user.id }).populate('service', 'name price');
  res.status(200).json(orders);
});

// @desc    Get all orders (Admin)
// @route   GET /api/orders
// @access  Private (Admin)
const getOrdersForAdmin = asyncHandler(async (req, res) => {
  const orders = await Order.find({}).populate('user', 'name email').populate('service', 'name');
  res.status(200).json(orders);
});

// @desc    Get recent 10 orders (Admin)
// @route   GET /api/orders/recent
// @access  Private (Admin)
const getRecentOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({}).sort({ createdAt: -1 }).limit(10).populate('user', 'name').populate('service', 'name');
  res.status(200).json(orders);
});

// @desc    Update order status (Admin)
// @route   PUT /api/orders/:id/status
// @access  Private (Admin)
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

// @desc    Create manual order (Admin)
// @route   POST /api/orders/manual
// @access  Private (Admin)
const createOrderManual = asyncHandler(async (req, res) => {
  const { userId, serviceId, quantity, link, status } = req.body;

  const order = await Order.create({
    user: userId,
    service: serviceId,
    quantity,
    link,
    status,
  });

  res.status(201).json({
    message: 'Manual order created successfully',
    order,
  });
});

// @desc    Check order statuses (Automatic)
// @route   GET /api/orders/status-check
// @access  Private (Protect) - Note: This is an example, could be a cron job
const checkOrderStatuses = asyncHandler(async (req, res) => {
  // 🛠️ Note: This is a placeholder for a real-world logic
  // which might involve an external API call to check order status
  // and update it in the database.
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