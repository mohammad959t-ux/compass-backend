const mongoose = require('mongoose');

const serviceSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: false },
    category: { type: String, required: false },
    subCategory: { type: String, required: false },
    imageUrl: { type: String, required: false }, // مسار الصورة بعد الرفع
    price: { type: Number, default: 0 }, // السعر بعد الهامش
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
