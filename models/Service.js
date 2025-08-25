const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Please add a name'] },
  description: { type: String },
  price: { type: Number, required: true }, // السعر النهائي للمستخدم
  costPrice: { type: Number, default: 0 }, // سعر التكلفة من المزود
  min: { type: Number, default: 1 },
  max: { type: Number, default: 1 },
  imageUrl: { type: String },
  isVisible: { type: Boolean, default: true },
  mainCategory: { type: String, required: true },
  subCategory: { type: String, required: true },
  apiServiceId: { type: String, unique: true, sparse: true }, // sparse حتى يقبل null للخدمات اليدوية
  qualityScore: { type: Number, default: 0 },
  pricePerUnit: { type: Number, default: 0 },
  priceForMinQuantity: { type: Number, default: 0 },
  priceForMaxQuantity: { type: Number, default: 0 },

  // ✅ جديد: طريقة التسعير
  pricingModel: {
    type: String,
    enum: ['per_unit', 'fixed'],
    default: 'per_unit'
  }
}, { timestamps: true });

// فهارس لتحسين الأداء
serviceSchema.index({ mainCategory: 1, subCategory: 1 });
serviceSchema.index({ qualityScore: -1 });
serviceSchema.index({ price: 1 });
serviceSchema.index({ pricePerUnit: 1 });
serviceSchema.index({ isVisible: 1, price: 1 });
serviceSchema.index({ priceForMinQuantity: 1 });
serviceSchema.index({ priceForMaxQuantity: 1 });
serviceSchema.index({ costPrice: 1 });
serviceSchema.index({ pricingModel: 1 }); // ✅ فهرس جديد حسب نوع التسعير

module.exports = mongoose.model('Service', serviceSchema);
