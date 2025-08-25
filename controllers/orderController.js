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
        const { serviceId, quantity, link, paymentMethod, paidAmount } = req.body;
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

        const finalUnitPrice = service.unitPrice || service.price || 0;
        const costPrice = service.costPrice || 0;
        const totalCost = (parsedQuantity / 1000) * finalUnitPrice;

        let initialPaidAmount = 0;
        let walletDeduction = 0;

        if (paymentMethod === 'Wallet') {
            if (user.balance < totalCost) {
                res.status(400);
                throw new Error('Insufficient balance');
            }
            user.balance -= totalCost;
            walletDeduction = totalCost;
            initialPaidAmount = totalCost;
            await user.save({ session });
        } else if (paymentMethod === 'Partial') {
            if (paidAmount && paidAmount > 0) {
                if (user.balance < paidAmount) {
                    res.status(400);
                    throw new Error('Insufficient balance for partial payment');
                }
                user.balance -= paidAmount;
                walletDeduction = paidAmount;
                initialPaidAmount = paidAmount;
                await user.save({ session });
            }
        }

        const order = await Order.create([{
            user: user._id,
            serviceId,
            quantity: parsedQuantity,
            link,
            price: finalUnitPrice,
            costPrice,
            totalCost,
            walletDeduction,
            paidAmount: initialPaidAmount,
            paymentMethod: paymentMethod || 'Manual',
            paymentStatus: initialPaidAmount >= totalCost ? 'Paid' : (initialPaidAmount > 0 ? 'Partial' : 'Unpaid'),
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
// إنشاء دفعة على طلب موجود
const payOrder = asyncHandler(async (req, res) => {
    const { amount, method } = req.body;
    const order = await Order.findById(req.params.id).populate('user');
    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }

    if (!amount || amount <= 0) {
        res.status(400);
        throw new Error('Payment amount must be greater than 0');
    }

    if (method === 'Wallet' && order.user) {
        const user = order.user;
        if (user.balance < amount) {
            res.status(400);
            throw new Error('Insufficient balance for this payment');
        }
        user.balance -= amount;
        await user.save();
    }

    order.paidAmount += amount;
    order.paymentMethod = method;
    order.paymentStatus = order.paidAmount >= order.totalCost ? 'Paid' : 'Partial';
    await order.save();

    res.status(200).json({ message: 'Payment recorded successfully', order });
});

// ==========================
// إنشاء طلبات متعددة من العربة (Bulk Order Creation)
const createBulkOrders = asyncHandler(async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { orders } = req.body;
        const user = req.user;

        if (!orders || !Array.isArray(orders) || orders.length === 0) {
            res.status(400);
            throw new Error('Orders array is required and cannot be empty.');
        }

        let totalCartCost = 0;
        const newOrders = [];
        const serviceIds = orders.map(order => order.serviceId);

        const services = await Service.find({ '_id': { '$in': serviceIds } }).session(session);
        if (services.length !== orders.length) {
            res.status(404);
            throw new Error('One or more services were not found.');
        }

        for (const orderItem of orders) {
            const { serviceId, quantity, link, paymentMethod, paidAmount } = orderItem;
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

            const finalUnitPrice = service.unitPrice || service.price || 0;
            const costPrice = service.costPrice || 0;
            const itemTotalCost = (parsedQuantity / 1000) * finalUnitPrice;
            totalCartCost += itemTotalCost;

            let initialPaidAmount = 0;
            let walletDeduction = 0;
            if (paymentMethod === 'Wallet') {
                if (user.balance < itemTotalCost) {
                    res.status(400);
                    throw new Error('Insufficient balance to complete all orders.');
                }
                user.balance -= itemTotalCost;
                walletDeduction = itemTotalCost;
                initialPaidAmount = itemTotalCost;
            } else if (paymentMethod === 'Partial') {
                if (paidAmount && paidAmount > 0) {
                    if (user.balance < paidAmount) {
                        res.status(400);
                        throw new Error('Insufficient balance for partial payment');
                    }
                    user.balance -= paidAmount;
                    walletDeduction = paidAmount;
                    initialPaidAmount = paidAmount;
                }
            }

            newOrders.push({
                user: user._id,
                serviceId,
                quantity: parsedQuantity,
                link,
                price: finalUnitPrice,
                costPrice,
                totalCost: itemTotalCost,
                walletDeduction,
                paidAmount: initialPaidAmount,
                paymentMethod: paymentMethod || 'Manual',
                paymentStatus: initialPaidAmount >= itemTotalCost ? 'Paid' : (initialPaidAmount > 0 ? 'Partial' : 'Unpaid'),
                status: 'Pending',
            });
        }

        await user.save({ session });
        const createdOrders = await Order.create(newOrders, { session });
        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            message: 'Orders created successfully',
            orders: createdOrders,
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
});

// ==========================
// جلب طلبات المستخدم
const getUserOrders = asyncHandler(async (req, res) => {
    const orders = await Order.find({ user: req.user.id })
        .populate('serviceId', 'name unitPrice price costPrice');
    res.status(200).json(orders);
});

// ==========================
// جلب جميع الطلبات (Admin)
const getOrdersForAdmin = asyncHandler(async (req, res) => {
    const orders = await Order.find({})
        .populate('user', 'name email')
        .populate('serviceId', 'name unitPrice price costPrice');
    res.status(200).json(orders);
});

// ==========================
// جلب آخر 10 طلبات (Admin)
const getRecentOrders = asyncHandler(async (req, res) => {
    const orders = await Order.find({})
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('user', 'name')
        .populate('serviceId', 'name unitPrice price costPrice');
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
// إنشاء طلب يدوي (Admin) | User ID اختياري
const createOrderManual = asyncHandler(async (req, res) => {
    const { userId, serviceId, quantity, link, status, paymentMethod, paidAmount, customPrice } = req.body;

    if (!quantity || quantity <= 0) {
        res.status(400);
        throw new Error('Quantity is required and must be greater than 0');
    }

    let finalUnitPrice = 0;
    let costPrice = 0;

    if (serviceId) {
        const service = await Service.findById(serviceId);
        if (!service) {
            res.status(404);
            throw new Error(`Service not found for ID: ${serviceId}`);
        }
        finalUnitPrice = service.unitPrice || service.price || 0;
        costPrice = service.costPrice || 0;
    } else if (customPrice && customPrice > 0) {
        finalUnitPrice = customPrice;
    }

    const totalCost = (quantity / 1000) * finalUnitPrice;

    let initialPaidAmount = 0;
    let walletDeduction = 0;
    if (paymentMethod === 'Wallet' && userId) {
        const user = await User.findById(userId);
        if (user.balance < totalCost) {
            res.status(400);
            throw new Error('Insufficient balance');
        }
        user.balance -= totalCost;
        walletDeduction = totalCost;
        initialPaidAmount = totalCost;
        await user.save();
    } else if (paymentMethod === 'Partial' && userId) {
        if (paidAmount && paidAmount > 0) {
            const user = await User.findById(userId);
            if (user.balance < paidAmount) {
                res.status(400);
                throw new Error('Insufficient balance for partial payment');
            }
            user.balance -= paidAmount;
            walletDeduction = paidAmount;
            initialPaidAmount = paidAmount;
            await user.save();
        }
    }

    const order = await Order.create({
        user: userId || null,
        serviceId: serviceId || null,
        quantity,
        link: link || '',
        status: status || 'Pending',
        price: finalUnitPrice,
        costPrice,
        totalCost,
        walletDeduction,
        paidAmount: initialPaidAmount,
        paymentMethod: paymentMethod || 'Manual',
        paymentStatus: initialPaidAmount >= totalCost ? 'Paid' : (initialPaidAmount > 0 ? 'Partial' : 'Unpaid'),
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
    createBulkOrders,
    payOrder,
    getUserOrders,
    getOrdersForAdmin,
    getRecentOrders,
    updateOrderStatus,
    createOrderManual,
    checkOrderStatuses
};
