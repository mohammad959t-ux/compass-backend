const cron = require('node-cron');
const axios = require('axios');
const Service = require('../models/Service');

// دالة لتحديث الخدمات من API
async function updateServicesFromApi() {
  try {
    const response = await axios.post(process.env.METJAR_API_URL, {
      key: process.env.METJAR_API_KEY,
      action: 'services',
    });

    const apiServices = response.data;
    let updatedCount = 0;
    let addedCount = 0;

    for (const apiService of apiServices) {
      const existingService = await Service.findOne({ apiServiceId: apiService.service });

      // حساب السعر الجديد
      const newPrice = apiService.rate ? parseFloat(((apiService.rate / 1000) * 1.2).toFixed(4)) : null;
      const newStock = apiService.min ? apiService.min : null;

      if (existingService) {
        existingService.price = newPrice !== null ? newPrice : existingService.price;
        existingService.stock = newStock !== null ? newStock : existingService.stock;
        await existingService.save();
        updatedCount++;
      } else {
        const newService = new Service({
          name: apiService.name,
          description: apiService.type,
          category: apiService.category,
          apiServiceId: apiService.service,
          price: newPrice,
          stock: newStock,
          createdBy: 'SYSTEM', // يمكنك وضع id مسؤول هنا
        });
        await newService.save();
        addedCount++;
      }
    }

    console.log(`✅ Services update finished. Updated: ${updatedCount}, Added: ${addedCount}`);
  } catch (error) {
    console.error('❌ Error updating services from API:', error.message);
  }
}

// -------------------------------
// 1️⃣ تشغيل تحديث أول مرة عند إقلاع السيرفر
// -------------------------------
(async () => {
  console.log('⏳ Initial service import on server start...');
  await updateServicesFromApi();
  console.log('✅ Initial service import completed.');
})();

// -------------------------------
// 2️⃣ جدولة التحديث كل ساعة
// -------------------------------
cron.schedule('0 * * * *', async () => {
  console.log('⏳ Running hourly service update...');
  await updateServicesFromApi();
});
