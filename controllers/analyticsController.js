const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const Expense = require('../models/Expense');

// @desc    Get total income, profit, and expenses with weekly stats per service
// @route   GET /api/analytics/income
// @access  Private/Admin
const getTotalIncome = asyncHandler(async (req, res) => {
  try {
    const { serviceName, mainCategory } = req.query;

    // Build match stage dynamically
    const matchStage = { status: 'Completed' };
    
    // If filters are provided
    if (serviceName) matchStage['serviceInfo.name'] = serviceName;
    if (mainCategory) matchStage['serviceInfo.mainCategory'] = mainCategory;

    // Aggregate orders with service info and order expenses
    const orders = await Order.aggregate([
      { $match: { status: 'Completed' } },
      {
        $lookup: {
          from: 'services',
          localField: 'serviceId',
          foreignField: '_id',
          as: 'serviceInfo'
        }
      },
      { $unwind: { path: '$serviceInfo', preserveNullAndEmptyArrays: true } },
      {
        $match: matchStage
      },
      {
        $lookup: {
          from: 'expenses',
          localField: '_id',
          foreignField: 'relatedOrder',
          as: 'orderExpenses'
        }
      },
      {
        $addFields: {
          orderExpenseTotal: { $sum: '$orderExpenses.amount' },
          profit: { 
            $subtract: [
              '$amountPaid', 
              { $multiply: ['$costPrice', { $divide: ['$quantity', 1000] }] }
            ]
          }
        }
      }
    ]);

    // Calculate totals
    const totalIncome = orders.reduce((acc, o) => acc + (o.amountPaid || 0), 0);
    const totalProfitBeforeGeneral = orders.reduce((acc, o) => acc + (o.profit || 0), 0);
    const totalOrderExpenses = orders.reduce((acc, o) => acc + (o.orderExpenseTotal || 0), 0);

    // General expenses (not linked to orders)
    const generalExpensesAgg = await Expense.aggregate([
      { $match: { relatedOrder: null } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalGeneralExpenses = generalExpensesAgg[0]?.total || 0;

    // Weekly stats per service
    const weeklyStatsAgg = await Order.aggregate([
      { $match: { status: 'Completed' } },
      {
        $lookup: {
          from: 'services',
          localField: 'serviceId',
          foreignField: '_id',
          as: 'serviceInfo'
        }
      },
      { $unwind: '$serviceInfo' },
      {
        $match: matchStage
      },
      {
        $lookup: {
          from: 'expenses',
          localField: '_id',
          foreignField: 'relatedOrder',
          as: 'orderExpenses'
        }
      },
      {
        $addFields: {
          orderExpenseTotal: { $sum: '$orderExpenses.amount' },
          profit: { 
            $subtract: [
              '$amountPaid', 
              { $multiply: ['$costPrice', { $divide: ['$quantity', 1000] }] }
            ]
          },
          week: { $week: '$createdAt' },
          year: { $year: '$createdAt' }
        }
      },
      {
        $group: {
          _id: { year: '$year', week: '$week', service: '$serviceInfo.name' },
          income: { $sum: '$amountPaid' },
          profit: { $sum: '$profit' },
          expenses: { $sum: '$orderExpenseTotal' },
          orders: { $push: { id: '$_id', quantity: '$quantity', price: '$price', amountPaid: '$amountPaid', createdAt: '$createdAt' } }
        }
      },
      { $sort: { '_id.year': 1, '_id.week': 1, '_id.service': 1 } }
    ]);

    // Merge general weekly expenses
    const generalWeeklyExpenses = await Expense.aggregate([
      { $match: { relatedOrder: null } },
      {
        $group: {
          _id: { year: { $year: '$date' }, week: { $week: '$date' } },
          expenses: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.week': 1 } }
    ]);

    const detailedWeeklyStats = weeklyStatsAgg.map(ws => {
      const generalExp = generalWeeklyExpenses.find(e => e._id.year === ws._id.year && e._id.week === ws._id.week);
      return {
        week: `Week ${ws._id.week}`,
        year: ws._id.year,
        service: ws._id.service,
        income: ws.income.toFixed(2),
        profit: (ws.profit - (generalExp?.expenses || 0)).toFixed(2),
        expenses: (ws.expenses + (generalExp?.expenses || 0)).toFixed(2),
        orders: ws.orders
      };
    });

    res.json({
      totalIncome: totalIncome.toFixed(2),
      totalProfit: (totalProfitBeforeGeneral - totalGeneralExpenses).toFixed(2),
      totalExpenses: (totalOrderExpenses + totalGeneralExpenses).toFixed(2),
      netProfit: (totalProfitBeforeGeneral - totalGeneralExpenses).toFixed(2),
      numberOfCompletedOrders: orders.length,
      weeklyStats: detailedWeeklyStats,
      orders: orders.map(o => ({
        id: o._id,
        serviceName: o.serviceInfo?.name,
        price: o.price,
        quantity: o.quantity,
        amountPaid: o.amountPaid,
        profit: o.profit.toFixed(2),
        orderExpenses: o.orderExpenseTotal.toFixed(2),
        createdAt: o.createdAt
      }))
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching analytics', error: error.message });
  }
});

module.exports = {
  getTotalIncome,
};
