const cron = require('node-cron');
const Order = require('../models/Order');
const { checkAndProcessOrder } = require('../controllers/orderController');

// -------------------------------
// 1️⃣ جدولة التحقق من حالة الطلبات كل 5 دقائق
// -------------------------------
cron.schedule('*/5 * * * *', async () => {
    console.log('⏳ Running automated order status check...');
    try {
        const ordersToCheck = await Order.find({
            status: { $in: ['Pending', 'In Progress'] }
        });

        for (const order of ordersToCheck) {
            await checkAndProcessOrder(order);
        }
        console.log('✅ Automated order status check finished.');
    } catch (error) {
        console.error('❌ Error during automated order status check:', error);
    }
});

// -------------------------------
// 2️⃣ جدولة تحديث الخدمات من API كل ساعة
// -------------------------------
// cron.schedule('0 * * * *', async () => {
//     console.log('⏳ Running hourly service update from API...');
//     try {
//         await importApiServices(); // معلق مؤقتًا
//         console.log('✅ Hourly service update finished.');
//     } catch (error) {
//         console.error('❌ Error during hourly service update:', error);
//     }
// });

// -------------------------------
// 3️⃣ تشغيل تحديث أول مرة عند إقلاع السيرفر
// -------------------------------
// (async () => {
//     console.log('⏳ Initial service import on server start...');
//     try {
//         await importApiServices(); // معلق مؤقتًا
//         console.log('✅ Initial service import finished.');
//     } catch (error) {
//         console.error('❌ Error during initial service import:', error);
//     }
// })();
