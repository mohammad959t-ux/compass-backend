const cron = require('node-cron');
const Order = require('../models/Order');
const { checkAndProcessOrder } = require('../controllers/orderController');

// --- تحقق من الطلبات كل 5 دقائق ---
cron.schedule('*/5 * * * *', async () => {
  console.log('⏳ Running automated order status check...');
  try {
    const ordersToCheck = await Order.find({ status: { $in: ['Pending', 'In Progress'] } });
    for (const order of ordersToCheck) {
      await checkAndProcessOrder(order);
    }
    console.log('✅ Automated order status check finished.');
  } catch (error) {
    console.error('❌ Error during automated order status check:', error);
  }
});
