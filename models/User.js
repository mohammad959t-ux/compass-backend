const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const transactionSchema = mongoose.Schema(
    // ... (مخطط المعاملات الخاص بك يبقى كما هو)
);

const userSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
    balance: { type: Number, default: 0 },
    transactions: [transactionSchema],

    // --- حقول جديدة للتحقق وإعادة التعيين ---
    isVerified: { type: Boolean, default: false },
    otp: { type: String, default: null },
    otpExpires: { type: Date, default: null },
    passwordResetToken: { type: String, default: null },
    passwordResetExpires: { type: Date, default: null },
    // -----------------------------------------
  },
  {
    timestamps: true,
  }
);

// تشفير كلمة المرور قبل الحفظ (يعمل للتسجيل والتحديث)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// دالة لمطابقة كلمة المرور عند تسجيل الدخول
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;