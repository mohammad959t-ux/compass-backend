const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Service = require('../models/Service');
const { callSmmApi } = require('../utils/smmApi');

const mapApiStatus = (status) => {
    const normalized = String(status || '').toLowerCase().trim();
    if (!normalized) return null;
    if (normalized.includes('completed')) return 'Completed';
    if (normalized.includes('canceled') || normalized.includes('cancelled') || normalized.includes('cancel')) return 'Canceled';
    if (normalized.includes('partial')) return 'In Progress';
    if (normalized.includes('processing') || normalized.includes('progress')) return 'In Progress';
    if (normalized.includes('pending') || normalized.includes('queued') || normalized.includes('waiting')) return 'Pending';
    return null;
};

const normalizeStatusResponse = (result, requestedIds) => {
    if (!result) return {};
    if (result.status) {
        const singleId = result.order || result.order_id || requestedIds[0];
        return { [String(singleId)]: result };
    }
    if (Array.isArray(result)) {
        return result.reduce((acc, item) => {
            if (item && (item.order || item.order_id)) {
                const id = item.order || item.order_id;
                acc[String(id)] = item;
            }
            return acc;
        }, {});
    }
    return result;
};

const chunkArray = (items, size) => {
    const chunks = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks;
};

// ==========================
// إنشاء طلب جديد (User)
const createOrder = asyncHandler(async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { serviceId, quantity, link, paymentMethod } = req.body;
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
        if (!service.apiServiceId) {
            res.status(400);
            throw new Error('Service is not available via API');
        }

        const finalUnitPrice = service.unitPrice || service.price || 0;
        const costPrice = service.costPrice || 0;
        const totalCost = (parsedQuantity / 1000) * finalUnitPrice;

        if (paymentMethod && String(paymentMethod).toLowerCase() !== 'wallet') {
            res.status(400);
            throw new Error('Only wallet payments are supported');
        }

        if (user.balance < totalCost) throw new Error('Insufficient balance');

        let initialPaidAmount = 0;
        let walletDeduction = 0;

        const apiPayload = { service: service.apiServiceId, link };
        if (service.pricingModel !== 'fixed') {
            apiPayload.quantity = parsedQuantity;
        }

        const apiResult = await callSmmApi('add', apiPayload);
        const apiOrderId = apiResult?.order || apiResult?.order_id || apiResult?.id;
        if (!apiOrderId) {
            res.status(502);
            throw new Error('Failed to create order with provider');
        }
        const initialStatus = 'Pending';

        user.balance -= totalCost;
        walletDeduction = totalCost;
        initialPaidAmount = totalCost;
        await user.save({ session });

        const order = await Order.create([{
            user: user._id,
            serviceId,
            quantity: parsedQuantity,
            link,
            price: finalUnitPrice,
            costPrice,
            totalCost,
            walletDeduction,
            amountPaid: initialPaidAmount,
            paymentMethod: 'wallet',
            status: initialStatus,
            apiOrderId: String(apiOrderId),
            category: service.mainCategory || service.category || 'Other',
            subCategory: service.subCategory || '',
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

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
        res.status(400);
        throw new Error('Payment amount must be greater than 0');
    }

    const normalizedMethod = String(method || '').toLowerCase().trim();
    if (!normalizedMethod) {
        res.status(400);
        throw new Error('Payment method is required');
    }
    if (normalizedMethod !== 'wallet') {
        res.status(400);
        throw new Error('Only wallet payments are supported');
    }

    const requesterId = req.user?._id?.toString();
    const orderUserId = order.user?._id?.toString?.() || order.user?.toString?.();
    const isAdmin = Boolean(req.user?.isAdmin);

    if (!isAdmin && (!orderUserId || orderUserId !== requesterId)) {
        res.status(403);
        throw new Error('Not authorized to pay for this order');
    }

    const totalCost = Number(order.totalCost || 0);
    const alreadyPaid = Number(order.amountPaid || 0);
    const remaining = totalCost - alreadyPaid;
    if (remaining <= 0) {
        res.status(400);
        throw new Error('Order is already fully paid');
    }
    if (parsedAmount > remaining) {
        res.status(400);
        throw new Error('Payment amount exceeds remaining balance');
    }

    if (normalizedMethod === 'wallet') {
        if (isAdmin) {
            res.status(403);
            throw new Error('Admins cannot charge user wallets');
        }
        if (!order.user) {
            res.status(400);
            throw new Error('Order does not have an associated user');
        }
        const user = order.user;
        if (user.balance < parsedAmount) throw new Error('Insufficient balance for this payment');
        user.balance -= parsedAmount;
        await user.save();
    }

    order.amountPaid += parsedAmount;
    order.paymentMethod = normalizedMethod;
    await order.save();

    res.status(200).json({ message: 'Payment recorded successfully', order });
});

// ==========================
// إنشاء طلب يدوي (Admin) | تصنيف تلقائي إذا serviceId موجود
const createOrderManual = asyncHandler(async (req, res) => {
    res.status(403);
    throw new Error('Manual orders are disabled. Use API services only.');
    const {
        userId,
        quantity,
        price,
        clientName,
        clientPhone,
        description,
        category,
        subCategory,
        paidAmount,
    } = req.body;

    if (!quantity || quantity <= 0 || !price || price <= 0) {
        res.status(400);
        throw new Error('Quantity and Price are required and must be greater than 0');
    }

    const finalPrice = Number(price);
    const totalCost = quantity * finalPrice;
    
    let initialPaidAmount = 0;
    if (paidAmount && paidAmount > 0) {
      initialPaidAmount = Number(paidAmount);
    }
    
    let status = 'Pending';
    if (initialPaidAmount >= totalCost) {
      status = 'Completed';
    }

    const order = await Order.create({
        isManual: true,
        user: userId || null,
        serviceId: null,
        quantity,
        link: '',
        price: finalPrice,
        // تم إزالة costPrice: 0 لتجنب مشاكل التحقق
        totalCost,
        walletDeduction: 0,
        amountPaid: initialPaidAmount,
        paymentMethod: 'manual', // تم تغيير القيمة إلى 'manual'
        status: status,
        clientName: clientName || '',
        clientPhone: clientPhone || '',
        description: description || '',
        category: category || 'أخرى',
        subCategory: subCategory || '',
    });

    res.status(201).json({
        message: 'Manual order created successfully',
        order,
    });
});

// ==========================
// الطلبات المتعددة (Bulk)
const createBulkOrders = asyncHandler(async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { orders } = req.body;
        const user = req.user;
        let availableBalance = user.balance;

        if (!orders || !Array.isArray(orders) || orders.length === 0) {
            res.status(400);
            throw new Error('Orders array is required and cannot be empty.');
        }

        let newOrders = [];
        const serviceIds = orders.map(order => order.serviceId).filter(Boolean);
        const services = await Service.find({ '_id': { '$in': serviceIds } }).session(session);

        for (const orderItem of orders) {
            const { serviceId, quantity, link, paymentMethod } = orderItem;
            if (!serviceId || !link) {
                res.status(400);
                throw new Error('serviceId and link are required for API orders.');
            }
            if (paymentMethod && String(paymentMethod).toLowerCase() !== 'wallet') {
                res.status(400);
                throw new Error('Only wallet payments are supported');
            }
            const parsedQuantity = parseInt(quantity, 10);
            if (isNaN(parsedQuantity) || parsedQuantity <= 0) throw new Error('Quantity must be a positive number.');

                        let finalUnitPrice = 0;
            let costPrice = 0;
            let finalCategory = 'Other';
            let finalSubCategory = '';

            const service = services.find(s => s._id.toString() === serviceId);
            if (!service) throw new Error(`Service not found for ID: ${serviceId}`);
            if (!service.apiServiceId) throw new Error('Service is not available via API');
            finalUnitPrice = service.unitPrice || service.price || 0;
            costPrice = service.costPrice || 0;
            finalCategory = service.mainCategory || service.category || finalCategory;
            finalSubCategory = service.subCategory || finalSubCategory;

            const totalCost = (parsedQuantity / 1000) * finalUnitPrice;
            if (availableBalance < totalCost) throw new Error('Insufficient balance to complete all orders.');

            let initialPaidAmount = 0;
            let walletDeduction = 0;

            const apiPayload = { service: service.apiServiceId, link };
            if (service.pricingModel !== 'fixed') {
                apiPayload.quantity = parsedQuantity;
            }

            const apiResult = await callSmmApi('add', apiPayload);
            const apiOrderId = apiResult?.order || apiResult?.order_id || apiResult?.id;
            if (!apiOrderId) throw new Error('Failed to create order with provider');
            const initialStatus = 'Pending';

            walletDeduction = totalCost;
            initialPaidAmount = totalCost;
            availableBalance -= totalCost;

            newOrders.push({
                user: user._id,
                serviceId,
                quantity: parsedQuantity,
                link,
                price: finalUnitPrice,
                costPrice,
                totalCost,
                walletDeduction,
                amountPaid: initialPaidAmount,
                paymentMethod: 'wallet',
                status: initialStatus,
                apiOrderId: String(apiOrderId),
                category: finalCategory,
                subCategory: finalSubCategory,
            });
        }

        if (availableBalance !== user.balance) {
            user.balance = availableBalance;
            await user.save({ session });
        }
        const createdOrders = await Order.create(newOrders, { session });
        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            message: 'Bulk orders created successfully',
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
        .populate('serviceId', 'name price costPrice mainCategory subCategory pricingModel');
    res.status(200).json(orders);
});

// ==========================
// جلب جميع الطلبات (Admin)
const getOrdersForAdmin = asyncHandler(async (req, res) => {
    const orders = await Order.find({})
        .populate('user', 'name email')
        .populate('serviceId', 'name price costPrice mainCategory subCategory pricingModel');
    res.status(200).json(orders);
});

// ==========================
// جلب آخر 10 طلبات (Admin)
const getRecentOrders = asyncHandler(async (req, res) => {
    const orders = await Order.find({})
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('user', 'name')
        .populate('serviceId', 'name price costPrice mainCategory subCategory pricingModel');
    res.status(200).json(orders);
});

// ==========================
// تحديث حالة الطلب (Admin)
const updateOrderStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
        req.params.id,
        { $set: { status } },
        { new: true, runValidators: false }
    );

    if (!order) {
        res.status(404);
        throw new Error(`Order not found with ID: ${req.params.id}`);
    }

    res.status(200).json({ message: 'Order status updated successfully' });
});

// ==========================
// Delete order (Admin)
const deleteOrder = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (!order) {
        res.status(404);
        throw new Error(`Order not found with ID: ${req.params.id}`);
    }
    await order.deleteOne();
    res.status(200).json({ message: 'Order deleted successfully' });
});

// ==========================
// تحقق من حالة الطلبات (Cron Job / Automatic)
const checkOrderStatuses = asyncHandler(async (req, res) => {
    const openOrders = await Order.find({
        apiOrderId: { $nin: [null, ''] },
        status: { $in: ['Pending', 'In Progress'] }
    }).select('_id apiOrderId status');

    if (!openOrders.length) {
        return res.status(200).json({ message: 'No API orders to check', checked: 0, updated: 0 });
    }

    const orderByApiId = new Map(openOrders.map(order => [String(order.apiOrderId), order]));
    let updated = 0;

    for (const batch of chunkArray([...orderByApiId.keys()], 100)) {
        const payload = batch.length === 1 ? { order: batch[0] } : { orders: batch.join(',') };
        const result = await callSmmApi('status', payload);
        const normalized = normalizeStatusResponse(result, batch);

        for (const [apiId, info] of Object.entries(normalized)) {
            const nextStatus = mapApiStatus(info?.status);
            if (!nextStatus) continue;
            const order = orderByApiId.get(String(apiId));
            if (order && order.status !== nextStatus) {
                await Order.updateOne({ _id: order._id }, { $set: { status: nextStatus } });
                updated += 1;
            }
        }
    }

    res.status(200).json({ message: 'Order status check completed', checked: openOrders.length, updated });
});

module.exports = {
    createOrder,
    createBulkOrders,
    payOrder,
    getUserOrders,
    getOrdersForAdmin,
    getRecentOrders,
    updateOrderStatus,
    deleteOrder,
    createOrderManual,
    checkOrderStatuses
};





