const mongoose = require('mongoose');

const expenseSchema = mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ['Ads', 'Shipping', 'Other'], // أنواع المصاريف
    },
    amount: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    date: {
      type: Date,
      default: Date.now,
    },
    relatedOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Expense', expenseSchema);
