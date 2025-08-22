// models/Client.js

const mongoose = require('mongoose');

// تعريف بنية (Schema) بيانات العميل في قاعدة البيانات
const clientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  logoUrl: {
    type: String,
    required: true,
  },
}, {
  timestamps: true, // لإضافة حقلي createdAt و updatedAt تلقائياً
});

// إنشاء وتصدير الموديل
const Client = mongoose.model('Client', clientSchema);

module.exports = Client;