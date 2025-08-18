const cron = require('node-cron');
const axios = require('axios');
const Service = require('../models/Service');
const { URLSearchParams } = require('url');

// دالة لحذف الخدمات التي لم تعد موجودة في API
async function deleteServicesFromDB(apiServiceIds) {
    try {
        const result = await Service.deleteMany({
            apiServiceId: { $nin: apiServiceIds },
            createdBy: 'SYSTEM'
        });
        if (result.deletedCount > 0) {
            console.log(`🗑️ Deleted ${result.deletedCount} services no longer in the API.`);
        }
    } catch (error) {
        console.error('❌ Error deleting old services:', error.message);
    }
}

// دالة لتحديث الخدمات من API
async function updateServicesFromApi() {
    console.log('⏳ Running scheduled service update...');
    try {
        const params = new URLSearchParams({
            key: process.env.METJAR_API_KEY,
            action: 'services',
        });

        const response = await axios.post(
            process.env.METJAR_API_URL,
            params.toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        const apiServices = response.data;
        if (!Array.isArray(apiServices)) {
            console.error('❌ API response is not an array.');
            return;
        }

        const apiServiceIds = apiServices.map(s => s.service);

        let updatedCount = 0;
        let addedCount = 0;

        await Promise.all(apiServices.map(async (apiService) => {
            const existingService = await Service.findOne({ apiServiceId: apiService.service });
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
                    createdBy: 'SYSTEM',
                });
                await newService.save();
                addedCount++;
            }
        }));

        await deleteServicesFromDB(apiServiceIds);

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
    await updateServicesFromApi();
});