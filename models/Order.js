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
    customPrice: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Completed', 'Canceled'],
      default: 'Pending',
    },
    price: {
      type: Number,
      required: true, // السعر بالـ USD
    },
    costPrice: {
      type: Number,
      required: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan',
      default: null,
    },
    currency: {
      type: String,
      enum: ['USD', 'IQD', 'SYP'],
      default: 'USD',
    },
    exchangeRate: {
      type: Number,
      default: 1, // 1 إذا كانت العملة USD، أو سعر الصرف مقابل USD
    },
    amountPaid: {
      type: Number,
      default: 0, // المبلغ المدفوع بالعملة المحلية قبل التحويل
    },
    walletDeduction: {
      type: Number,
      default: 0, // المبلغ المخصوم من المحفظة بالـ USD
    },
    expectedCompletion: {
      type: Date,
      default: () => new Date(Date.now() + 24*60*60*1000), // تلقائياً 24 ساعة
    },
  },
  { timestamps: true }
);

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;

