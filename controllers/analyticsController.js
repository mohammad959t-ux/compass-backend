const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const Expense = require('../models/Expense');
const mongoose = require('mongoose');

// @desc    Get total income, profit, and expenses with weekly stats
// @route   GET /api/analytics/income
// @access  Private/Admin
const getTotalIncome = asyncHandler(async (req, res) => {
  try {
    // Pipeline to calculate total income, profit, and order-related expenses
    const orderAnalytics = await Order.aggregate([
      // Stage 1: Filter for completed orders
      { $match: { status: 'Completed' } },
      
      // Stage 2: Join with the services collection to get the service name
      {
        $lookup: {
          from: 'services',
          localField: 'serviceId',
          foreignField: '_id',
          as: 'serviceInfo'
        }
      },

      // Stage 3: Unwind the serviceInfo array to access its fields
      { $unwind: { path: '$serviceInfo', preserveNullAndEmptyArrays: true } },

      // Stage 4: Add expenses to the order documents by joining with expenses collection
      {
        $lookup: {
          from: 'expenses',
          localField: '_id',
          foreignField: 'relatedOrder',
          as: 'orderExpenses'
        }
      },
      
      // Stage 5: Group and calculate
      {
        $group: {
          _id: null,
          totalIncome: { $sum: { $multiply: ['$price', '$quantity'] } },
          totalProfit: { $sum: { $subtract: [{ $multiply: ['$price', '$quantity'] }, { $multiply: ['$costPrice', '$quantity'] }] } },
          totalOrderExpenses: { $sum: { $sum: '$orderExpenses.amount' } },
          completedOrders: { $push: {
            id: '$_id',
            serviceName: '$serviceInfo.name',
            price: '$price',
            quantity: '$quantity',
            expenses: { $sum: '$orderExpenses.amount' },
            status: '$status',
            createdAt: '$createdAt'
          }},
          // Get unique weeks for aggregation
          weeks: { $addToSet: { $week: '$createdAt' } }
        }
      }
    ]);

    const orderData = orderAnalytics[0] || {
      totalIncome: 0,
      totalProfit: 0,
      totalOrderExpenses: 0,
      completedOrders: [],
    };
    
    // Calculate total general expenses separately
    const generalExpenses = await Expense.aggregate([
      { $match: { relatedOrder: null } },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    const totalGeneralExpenses = generalExpenses[0]?.total || 0;

    // Calculate weekly stats
    const weeklyStats = await Order.aggregate([
      // Stage 1: Filter for completed orders
      { $match: { status: 'Completed' } },
      // Stage 2: Add order expenses
      {
        $lookup: {
          from: 'expenses',
          localField: '_id',
          foreignField: 'relatedOrder',
          as: 'orderExpenses'
        }
      },
      // Stage 3: Group by week
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            week: { $week: "$createdAt" }
          },
          income: { $sum: { $multiply: ["$price", "$quantity"] } },
          profit: { $sum: { $subtract: [{ $multiply: ["$price", "$quantity"] }, { $multiply: ["$costPrice", "$quantity"] }] } },
          expenses: { $sum: { $sum: "$orderExpenses.amount" } }
        }
      },
      // Stage 4: Sort by week
      { $sort: { "_id.year": 1, "_id.week": 1 } }
    ]);

    const generalWeeklyExpenses = await Expense.aggregate([
        { $match: { relatedOrder: null } },
        {
            $group: {
                _id: {
                    year: { $year: "$date" },
                    week: { $week: "$date" }
                },
                expenses: { $sum: "$amount" }
            }
        },
        { $sort: { "_id.year": 1, "_id.week": 1 } }
    ]);

    const mergedWeeklyStats = weeklyStats.map(orderStat => {
        const generalExp = generalWeeklyExpenses.find(expStat => 
            expStat._id.year === orderStat._id.year && expStat._id.week === orderStat._id.week
        );
        const totalExpenses = orderStat.expenses + (generalExp?.expenses || 0);
        return {
            week: `Week ${orderStat._id.week}`,
            income: orderStat.income.toFixed(2),
            profit: orderStat.profit.toFixed(2),
            expenses: totalExpenses.toFixed(2)
        };
    });

    res.json({
      totalIncome: orderData.totalIncome.toFixed(2),
      totalProfit: (orderData.totalProfit - totalGeneralExpenses).toFixed(2),
      totalExpenses: (orderData.totalOrderExpenses + totalGeneralExpenses).toFixed(2),
      netProfit: (orderData.totalProfit - totalGeneralExpenses).toFixed(2),
      numberOfCompletedOrders: orderData.completedOrders.length,
      weeklyStats: mergedWeeklyStats,
      orders: orderData.completedOrders
    });

  } catch (error) {
    res.status(500).json({ message: 'Error fetching analytics', error: error.message });
  }
});

module.exports = {
  getTotalIncome,
};
