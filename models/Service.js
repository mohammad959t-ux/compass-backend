// Service.js

const mongoose = require('mongoose');

const serviceSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: false },

    // التصنيفات
    mainCategory: { type: String, required: false },
    subCategory: { type: String, required: false },

    imageUrl: { type: String, required: false },

    // الأسعار
    price: { type: Number, default: 0 },      // السعر النهائي للمستخدم (مع هامش الربح)
    unitPrice: { type: Number, default: 0 },  // السعر لكل 1000 وحدة أو لكل كمية قياسية
    costPrice: { type: Number, default: 0 },  // سعر الشراء من المزود

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

    // الحد الأدنى والأقصى للكمية
    min: { type: Number, default: 1 },
    max: { type: Number, default: 1 },
  },
  { timestamps: true }
);

const Service = mongoose.model('Service', serviceSchema);
module.exports = Service;
