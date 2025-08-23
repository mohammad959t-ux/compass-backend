// ... (الكود السابق)
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Service = require('../models/Service');
const User = require('../models/User');

// ==========================
// إنشاء طلب جديد (User)
const createOrder = asyncHandler(async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { serviceId, quantity, link } = req.body;
        const user = req.user;

        if (!serviceId || !quantity || !link) {
            res.status(400);
            throw new Error('Please add all required fields: serviceId, quantity, link');
        }

        const parsedQuantity = parseInt(quantity, 10);
        if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
            res.status(400);
            throw new Error('Quantity must be a positive number');
        }

        const service = await Service.findById(serviceId).session(session);
        if (!service) {
            res.status(404);
            throw new Error(`Service not found for ID: ${serviceId}`);
        }

        const finalUnitPrice = service.price;
        const totalCost = (parsedQuantity / 1000) * finalUnitPrice;

        if (user.balance < totalCost) {
            res.status(400);
            throw new Error('Insufficient balance');
        }

        user.balance -= totalCost;
        await user.save({ session });

        const order = await Order.create([{
            user: user._id,
            serviceId,
            quantity: parsedQuantity,
            link,
            price: service.unitPrice || 0,
            costPrice: service.costPrice || 0,
            totalCost: totalCost || 0,
            walletDeduction: totalCost || 0,
            status: 'Pending',
        }], { session });

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            message: 'Order created successfully',
            order: order[0],
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
});

// ==========================
// إنشاء طلبات متعددة من العربة (Bulk Order Creation)
const createBulkOrders = asyncHandler(async (req, res) => {
    // البدء بمعاملة Mongoose لضمان أن العملية بأكملها تنجح أو تفشل
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { orders } = req.body;
        const user = req.user;

        // التحقق من وجود مصفوفة الطلبات
        if (!orders || !Array.isArray(orders) || orders.length === 0) {
            res.status(400);
            throw new Error('Orders array is required and cannot be empty.');
        }

        let totalCartCost = 0;
        const newOrders = [];
        const serviceIds = orders.map(order => order.serviceId);

        // جلب جميع الخدمات المطلوبة مرة واحدة لتقليل طلبات قاعدة البيانات
        const services = await Service.find({ '_id': { '$in': serviceIds } }).session(session);
        if (services.length !== orders.length) {
            res.status(404);
            throw new Error('One or more services were not found.');
        }

        // التحقق من صلاحية كل عنصر في العربة وحساب التكلفة الإجمالية
        for (const orderItem of orders) {
            const { serviceId, quantity, link } = orderItem;

            if (!serviceId || !quantity || !link) {
                res.status(400);
                throw new Error('Each order item must have serviceId, quantity, and link.');
            }

            const parsedQuantity = parseInt(quantity, 10);
            if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
                res.status(400);
                throw new Error(`Quantity for service ${serviceId} must be a positive number.`);
            }

            const service = services.find(s => s._id.toString() === serviceId);
            if (!service) {
                res.status(404);
                throw new Error(`Service not found for ID: ${serviceId}`);
            }

            const finalUnitPrice = service.price;
            const itemTotalCost = (parsedQuantity / 1000) * finalUnitPrice;
            totalCartCost += itemTotalCost;

            // إعداد كائن الطلب الجديد
            newOrders.push({
                user: user._id,
                serviceId,
                quantity: parsedQuantity,
                link,
                price: service.unitPrice || 0,
                costPrice: service.costPrice || 0,
                totalCost: itemTotalCost || 0,
                walletDeduction: itemTotalCost || 0,
                status: 'Pending',
            });
        }

        // التحقق من رصيد المستخدم مرة واحدة قبل خصم المبلغ
        if (user.balance < totalCartCost) {
            res.status(400);
            throw new Error('Insufficient balance to complete all orders.');
        }

        // خصم المبلغ الإجمالي من رصيد المستخدم
        user.balance -= totalCartCost;
        await user.save({ session });

        // إنشاء جميع الطلبات في قاعدة البيانات كجزء من المعاملة
        const createdOrders = await Order.create(newOrders, { session });

        // إتمام المعاملة
        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            message: 'Orders created successfully',
            orders: createdOrders,
        });

    } catch (error) {
        // إذا حدث أي خطأ، يتم التراجع عن جميع التغييرات في المعاملة
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
});

// ==========================
// جلب طلبات المستخدم
const getUserOrders = asyncHandler(async (req, res) => {
    const orders = await Order.find({ user: req.user.id })
        .populate('serviceId', 'name price');
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
        throw new Error(`Order not found with ID: ${req.params.id}`);
    }

    order.status = status;
    await order.save();
    res.status(200).json({ message: 'Order status updated successfully' });
});

// ==========================
// إنشاء طلب يدوي (Admin)
const createOrderManual = asyncHandler(async (req, res) => {
    const { userId, serviceId, quantity, link, status } = req.body;

    if (!userId || !serviceId || !quantity || !link) {
        res.status(400);
        throw new Error('Please add all required fields: userId, serviceId, quantity, link');
    }

    const parsedQuantity = parseInt(quantity, 10);
    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
        res.status(400);
        throw new Error('Quantity must be a positive number');
    }

    const service = await Service.findById(serviceId);
    const finalUnitPrice = service ? service.price : 0;
    const totalCost = (parsedQuantity / 1000) * finalUnitPrice;

    const order = await Order.create({
        user: userId,
        serviceId,
        quantity: parsedQuantity,
        link,
        status: status || 'Pending',
        price: service ? service.unitPrice : 0,
        costPrice: service ? service.costPrice : 0,
        totalCost: totalCost || 0,
        walletDeduction: totalCost || 0,
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
    createBulkOrders, // ✅ إضافة الدالة الجديدة هنا
    getUserOrders,
    getOrdersForAdmin,
    getRecentOrders,
    updateOrderStatus,
    createOrderManual,
    checkOrderStatuses
};