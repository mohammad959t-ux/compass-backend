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
    },
    link: {
      type: String,
      default: '',
    },
    price: {
      type: Number,
      required: true, // السعر الأساسي بالـ USD
    },
    costPrice: {
      type: Number,
      required: true, // سعر التكلفة بالـ USD
    },
    totalCost: {
      type: Number,
      required: true, // السعر النهائي بعد الهامش
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
      default: () => new Date(Date.now() + 24*60*60*1000), // 24 ساعة تلقائياً
    },
  },
  { timestamps: true }
);

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
