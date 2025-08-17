const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Service = require('../models/Service');
const Order = require('../models/Order');
const Expense = require('../models/Expense');

// @desc    Get dashboard stats and recent data
// @route   GET /api/dashboard/stats
// @access  Private/Admin
const getDashboardStats = asyncHandler(async (req, res) => {
    try {
        const [totalUsers, totalServices, totalOrders, recentOrders, allOrders, allExpenses] = await Promise.all([
            User.countDocuments(),
            Service.countDocuments(),
            Order.countDocuments(),
            // هذا هو السطر الذي تم تعديله
            Order.find().sort({ createdAt: -1 }).limit(10).populate('user', 'name').populate('serviceId', 'name'),
            Order.find(),
            Expense.find(),
        ]);

        let totalIncome = 0;
        let totalExpenses = 0;
        
        allOrders.forEach(order => {
            if (order.status === 'Completed' && order.price && order.quantity) {
                totalIncome += (parseFloat(order.price) || 0) * (parseInt(order.quantity) || 0);
            }
        });

        allExpenses.forEach(expense => {
            totalExpenses += parseFloat(expense.amount) || 0;
        });

        const netProfit = totalIncome - totalExpenses;
        const completedOrdersCount = allOrders.filter(order => order.status === 'Completed').length;
        const pendingOrdersCount = allOrders.filter(order => order.status === 'Pending').length;

        const monthlyData = {};
        allOrders.forEach(order => {
            if (order.status === 'Completed' && order.createdAt && order.price && order.quantity) {
                const month = new Date(order.createdAt).toISOString().slice(0, 7);
                if (!monthlyData[month]) {
                    monthlyData[month] = { income: 0, orders: 0 };
                }
                monthlyData[month].income += (parseFloat(order.price) || 0) * (parseInt(order.quantity) || 0);
                monthlyData[month].orders += 1;
            }
        });

        const chartData = Object.keys(monthlyData).sort().map(month => ({
            month,
            income: parseFloat(monthlyData[month].income.toFixed(2)),
            orders: monthlyData[month].orders,
        }));

        res.json({
            totalUsers,
            totalServices,
            totalOrders,
            totalIncome: totalIncome.toFixed(2),
            totalExpenses: totalExpenses.toFixed(2),
            netProfit: netProfit.toFixed(2),
            completedOrdersCount,
            pendingOrdersCount,
            recentOrders,
            chartData,
        });
    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        res.status(500).json({ message: "Server error while fetching dashboard data." });
    }
});

module.exports = {
    getDashboardStats,
};