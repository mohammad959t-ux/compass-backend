const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name']
  },
  description: {
    type: String,
    required: false
  },
  price: { // السعر الأساسي لكل 1000
    type: Number,
    required: true,
  },
  min: {
    type: Number,
    default: 1
  },
  max: {
    type: Number,
    default: 1
  },
  imageUrl: {
    type: String
  },
  isVisible: {
    type: Boolean,
    default: true
  },
  mainCategory: {
    type: String,
    required: true
  },
  subCategory: {
    type: String,
    required: true
  },
  apiServiceId: { // مُعرّف الخدمة في الواجهة البرمجية الخارجية
    type: String,
    unique: true
  },
  qualityScore: {
    type: Number,
    default: 0
  },
  pricePerUnit: { // ✅ حقل جديد: السعر النهائي للوحدة الواحدة
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// ✅ إضافة فهارس لزيادة سرعة البحث والفرز
serviceSchema.index({ mainCategory: 1, subCategory: 1 });
serviceSchema.index({ qualityScore: -1 });
serviceSchema.index({ price: 1 });
serviceSchema.index({ pricePerUnit: 1 });
serviceSchema.index({ isVisible: 1, price: 1 });
serviceSchema.index({ apiServiceId: 1 });

module.exports = mongoose.model('Service', serviceSchema);