const mongoose = require('mongoose');

const serviceSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: false, // غير إلزامية لتجنب أخطاء API
    },
    category: {
      type: String,
      required: false, // غير إلزامية لتجنب أخطاء API
    },

    imageUrl: {
      type: String,
      required: false,
    },

    // للخدمات الفردية
    price: { type: Number, default: 0 },
    costPrice: { type: Number, default: 0 },
    apiServiceId: { type: String, unique: true, sparse: true },

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
      ref: 'User',
      required: false, // غير إلزامية لتجنب أخطاء API
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Service = mongoose.model('Service', serviceSchema);
module.exports = Service;
