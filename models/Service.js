const mongoose = require('mongoose');

const serviceSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },

    // حقل الصورة لكل خدمة
    imageUrl: {
      type: String,
      required: false, // يمكن تغييره إلى true إذا كانت إلزامية
    },

    // للخدمات الفردية
    price: { type: Number },
    costPrice: { type: Number },
    apiServiceId: { type: String, unique: true, sparse: true }, // sparse يسمح أن يكون فارغ للحزم

    // للحزم (Packages)
    plans: [
      {
        name: { type: String, required: true },
        price: { type: Number, required: true },
        costPrice: { type: Number, required: true },
        apiServiceId: { type: String },
        quantity: { type: Number },
      },
    ],

    stock: {
      type: Number,
      required: true,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

const Service = mongoose.model('Service', serviceSchema);
module.exports = Service;
