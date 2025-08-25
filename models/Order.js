const mongoose = require('mongoose');

const orderSchema = mongoose.Schema(
  {
    // المستخدم (ضروري للطلبات العادية، اختياري للطلبات اليدوية)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: function() { return !this.isManual; }
    },

    // خدمة من API (ضروري للطلبات العادية، اختياري للطلبات اليدوية)
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: function() { return !this.isManual; }
    },

    apiOrderId: { type: String, default: null },

    // الكمية
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

    // الرابط (ضروري للطلبات العادية)
    link: {
      type: String,
      default: '',
      required: function() { return !this.isManual; }
    },

    price: {
      type: Number,
      required: function() { return !this.isManual; },
      validate: {
        validator: function (v) {
          return v > 0;
        },
        message: 'Price must be greater than 0',
      },
    },

    costPrice: {
      type: Number,
      required: function() { return !this.isManual; },
      validate: {
        validator: function (v) {
          return v > 0;
        },
        message: 'Cost price must be greater than 0',
      },
    },

    totalCost: {
      type: Number,
      required: true, // نحسبه دائماً
      validate: {
        validator: function (v) {
          return v >= 0;
        },
        message: 'Total cost must be greater than or equal 0',
      },
    },

    amountPaid: {
      type: Number,
      default: 0,
      validate: {
        validator: function (v) {
          return v >= 0;
        },
        message: 'Amount paid cannot be negative',
      },
    },

    paymentMethod: {
      type: String,
      enum: ['wallet', 'manual', 'partial', 'other'],
      default: 'wallet',
    },

    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Completed', 'Canceled'],
      default: 'Pending',
    },

    walletDeduction: { type: Number, default: 0 },

    expectedCompletion: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },

    // -------------------------
    // حقول الطلب اليدوي
    // -------------------------
    isManual: { type: Boolean, default: false },
    clientName: { type: String, default: '' },
    clientPhone: { type: String, default: '' },
    description: { type: String, default: '' },
    category: { type: String, default: 'أخرى' },
    subCategory: { type: String, default: '' },
  },
  { timestamps: true }
);

// ==========================
// قبل الحفظ، حساب totalCost تلقائياً
orderSchema.pre('validate', async function (next) {
  if (this.isManual) {
    // للطلبات اليدوية: إذا كان السعر مخصص
    this.totalCost = this.price ? this.price * this.quantity : 0;
  } else {
    // للطلبات العادية
    if (this.isModified('quantity') || this.isModified('price')) {
      this.totalCost = (this.quantity / 1000) * this.price;
    }
  }
  next();
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
