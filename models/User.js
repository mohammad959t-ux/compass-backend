const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Schema لتسجيل معاملات المحفظة
const transactionSchema = mongoose.Schema(
  {
    type: { type: String, enum: ['credit', 'debit'], required: true }, // شحن أو خصم
    amountUSD: { type: Number, required: true }, // المبلغ المحول إلى USD
    originalAmount: { type: Number }, // المبلغ الذي دفعه العميل بالعملة المحلية
    currency: { type: String, enum: ['USD', 'IQD', 'SYP'] }, // نوع العملة المدفوعة
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // من قام بالعملية
    note: { type: String }, // ملاحظات إضافية
  },
  { timestamps: true }
);

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    balance: {
      type: Number,
      default: 0, // الرصيد بالـ USD
    },
    transactions: [transactionSchema], // سجل معاملات المحفظة
  },
  {
    timestamps: true,
  }
);

// تشفير كلمة المرور قبل الحفظ
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// دالة لمطابقة كلمة المرور عند تسجيل الدخول
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
