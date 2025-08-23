const mongoose = require('mongoose');

const orderSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Service',
    },
    apiOrderId: {
      type: String,
      default: null,
    },
    quantity: {
      type: Number,
      default: 1,
      validate: {
        validator: function (v) {
          return v >= 1;
        },
        message: 'Quantity must be at least 1',
      },
    },
    link: {
      type: String,
      default: '',
    },
    price: {
      type: Number,
      required: true, // السعر الأساسي بالـ USD
      validate: {
        validator: function (v) {
          return v > 0;
        },
        message: 'Price must be greater than 0',
      },
    },
    costPrice: {
      type: Number,
      required: true, // سعر التكلفة بالـ USD
      validate: {
        validator: function (v) {
          return v > 0;
        },
        message: 'Cost price must be greater than 0',
      },
    },
    totalCost: {
      type: Number,
      required: true, // السعر النهائي بعد الهامش
      validate: {
        validator: function (v) {
          return v > 0;
        },
        message: 'Total cost must be greater than 0',
      },
    },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Completed', 'Canceled'],
      default: 'Pending',
    },
    walletDeduction: {
      type: Number,
      default: 0, // المبلغ المخصوم من المحفظة بالـ USD
    },
    expectedCompletion: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 ساعة تلقائياً
    },
  },
  { timestamps: true }
);

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
