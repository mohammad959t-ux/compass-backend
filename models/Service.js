// Service.js

const mongoose = require('mongoose');

const serviceSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: false },
    // تغييرات هنا: إضافة حقل mainCategory
    mainCategory: { type: String, required: false }, // للتصنيفات الرئيسية (مثل "زيادة التفاعل" و "خدمات رقمية")
    subCategory: { type: String, required: false }, // للفئات الفرعية (مثل "فيسبوك")
    imageUrl: { type: String, required: false },
    price: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 },
    costPrice: { type: Number, default: 0 },
    apiServiceId: { type: String, unique: true, sparse: true },
    plans: [
      {
        name: { type: String, required: true },
        price: { type: Number, required: true },
        costPrice: { type: Number, required: true },
        apiServiceId: { type: String },
        quantity: { type: Number },
      },
    ],
    stock: { type: Number, required: true, default: 0 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    isVisible: { type: Boolean, default: true },
    min: { type: Number, default: 1 },
    max: { type: Number, default: 1 },
  },
  { timestamps: true }
);

const Service = mongoose.model('Service', serviceSchema);
module.exports = Service;