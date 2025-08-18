// services_sync.js

const axios = require('axios');
const translate = require('@iamtraction/google-translate');
const ServiceModel = require('../models/ServiceModel'); // تأكد من المسار الصحيح

// دالة جلب وترجمة وتخزين الخدمات
async function syncAndTranslateServices() {
  // ... (الكود الذي ذكرناه سابقاً)
}

// جدولة العملية لتتم كل 24 ساعة
const cron = require('node-cron');
cron.schedule('0 0 * * *', () => {
  console.log('بدء مهمة التزامن والترجمة المجدولة...');
  syncAndTranslateServices();
});