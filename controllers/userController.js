const asyncHandler = require('express-async-handler');
const { validationResult } = require('express-validator');
const crypto = require('crypto');
const { Resend } = require('resend');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// إنشاء نسخة من Resend لاستخدامها في جميع الدوال
const resend = new Resend(process.env.RESEND_API_KEY);

// @desc    Register a new user and send OTP
const registerUser = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400);
    throw new Error(errors.array()[0].msg);
  }
  const { name, email, password } = req.body;
  let user = await User.findOne({ email });
  if (user && user.isVerified) {
    res.status(400);
    throw new Error('هذا البريد الإلكتروني مسجل بالفعل.');
  }
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpires = Date.now() + 10 * 60 * 1000;
  if (user && !user.isVerified) {
    console.log(`--- User ${email} exists but is not verified. Updating OTP. ---`);
    user.password = password;
    user.name = name;
    user.otp = otp;
    user.otpExpires = otpExpires;
  } else {
    console.log(`--- Creating new user for ${email}. ---`);
    user = new User({ name, email, password, otp, otpExpires });
  }
  await user.save();
  console.log("--- User saved. Preparing to send email... ---");
  console.log(`--- Sending From: ${process.env.EMAIL_FROM}, To: ${user.email} ---`);
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
      console.error("--- FATAL ERROR: RESEND_API_KEY or EMAIL_FROM is missing from environment variables. ---");
      res.status(500);
      throw new Error('خطأ في إعدادات الخادم. لا يمكن إرسال البريد الإلكتروني.');
  }
  try {
    const data = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: 'رمز التحقق لتفعيل حسابك',
      html: `<p>رمز التحقق الخاص بك هو: <strong>${otp}</strong>. وهو صالح لمدة 10 دقائق.</p>`,
    });
    console.log("--- Email sent SUCCESSFULLY. Response from Resend: ---", JSON.stringify(data));
    res.status(201).json({
      success: true,
      message: `تم إرسال رمز التحقق إلى ${user.email}. يرجى التحقق من بريدك.`,
    });
  } catch (error) {
    console.error("--- FAILED to send email. Error Details: ---", error);
    res.status(500);
    throw new Error('فشل إرسال بريد التحقق. يرجى التأكد من صحة البريد والمحاولة مرة أخرى.');
  }
});

// @desc    Verify OTP and log user in
const verifyOtp = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) {
        res.status(400);
        throw new Error('الرجاء إدخال البريد الإلكتروني والرمز.');
    }
    const user = await User.findOne({ email, otp, otpExpires: { $gt: Date.now() } });
    if (!user) {
        res.status(400);
        throw new Error('رمز التحقق غير صالح أو انتهت صلاحيته.');
    }
    user.isVerified = true;
    user.otp = null;
    user.otpExpires = null;
    await user.save();
    res.status(200).json({
        message: 'تم التحقق من البريد الإلكتروني بنجاح!',
        _id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin,
        balance: user.balance, token: generateToken(user._id),
    });
});

// @desc    Auth user & get token
const authUser = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400);
    throw new Error(errors.array()[0].msg);
  }
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (user && (await user.matchPassword(password))) {
    if (!user.isVerified) {
      res.status(401);
      throw new Error('حسابك غير مفعل. يرجى التحقق من بريدك الإلكتروني أولاً.');
    }
    res.json({
      _id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin,
      balance: user.balance, token: generateToken(user._id),
    });
  } else {
    res.status(401);
    throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
  }
});

// @desc    Forgot password
const forgotPassword = asyncHandler(async (req, res) => {
    // ✅✅✅ تعديل: جعل الدالة تقبل البريد من المستخدم الحالي أو من جسم الطلب
    const email = req.body.email || (req.user ? req.user.email : null);

    if (!email) {
        res.status(400);
        throw new Error("البريد الإلكتروني مطلوب لبدء عملية إعادة التعيين.");
    }

    const user = await User.findOne({ email });
    if (!user) {
        return res.status(200).json({ message: 'إذا كان البريد الإلكتروني مسجلاً، فسيتم إرسال رابط إعادة التعيين إليه.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000;
    await user.save();
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    const message = `<p>لقد طلبت إعادة تعيين كلمة المرور. يرجى الضغط على هذا الرابط لإعادة التعيين:</p><a href="${resetUrl}">${resetUrl}</a>`;
    try {
        await resend.emails.send({
            from: process.env.EMAIL_FROM, to: user.email,
            subject: 'طلب إعادة تعيين كلمة المرور', html: message,
        });
        res.status(200).json({ message: 'تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني.' });
    } catch (error) {
        user.passwordResetToken = null;
        user.passwordResetExpires = null;
        await user.save();
        res.status(500);
        throw new Error('حدث خطأ أثناء إرسال بريد إعادة التعيين.');
    }
});

// @desc    Reset password
const resetPassword = asyncHandler(async (req, res) => {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
    });
    if (!user) {
        res.status(400);
        throw new Error('رابط إعادة التعيين غير صالح أو انتهت صلاحيته.');
    }
    user.password = req.body.password;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();
    res.status(200).json({ message: 'تم تغيير كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول.' });
});

// @desc    Get user profile
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user) {
    res.json({
      _id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin, balance: user.balance,
    });
  } else {
    res.status(404);
    throw new Error('المستخدم غير موجود');
  }
});

// @desc    Update user profile (name only)
const updateUserProfile = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400);
    throw new Error(errors.array()[0].msg);
  }
  const user = await User.findById(req.user._id);
  if (user) {
    user.name = req.body.name || user.name;
    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id, name: updatedUser.name, email: updatedUser.email, isAdmin: updatedUser.isAdmin,
      balance: updatedUser.balance, token: generateToken(updatedUser._id),
    });
  } else {
    res.status(404);
    throw new Error('المستخدم غير موجود');
  }
});

// @desc    Change user password
const changePassword = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400);
    throw new Error(errors.array()[0].msg);
  }
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id);
  if (user && (await user.matchPassword(oldPassword))) {
    user.password = newPassword;
    await user.save();
    res.json({ message: 'تم تغيير كلمة المرور بنجاح' });
  } else {
    res.status(401);
    throw new Error('كلمة المرور القديمة غير صحيحة.');
  }
});

// @desc    Get all users for admin
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).select('-password');
  res.json(users);
});

// @desc    Delete a user
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (user) {
    await user.deleteOne();
    res.json({ message: 'تم حذف المستخدم' });
  } else {
    res.status(404);
    throw new Error('المستخدم غير موجود');
  }
});

// @desc    Get user by ID
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (user) {
    res.json(user);
  } else {
    res.status(404);
    throw new Error('المستخدم غير موجود');
  }
});

// @desc    Update a user
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    if (req.body.isAdmin !== undefined) {
      user.isAdmin = req.body.isAdmin;
    }
    if (req.body.password) {
      user.password = req.body.password;
    }
    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id, name: updatedUser.name, email: updatedUser.email,
      isAdmin: updatedUser.isAdmin, balance: updatedUser.balance,
    });
  } else {
    res.status(404);
    throw new Error('المستخدم غير موجود');
  }
});

// @desc    Add balance to a user
const addBalance = asyncHandler(async (req, res) => {
  const { userId, amount } = req.body;
  const numericAmount = Number(amount);
  if (!userId || !numericAmount || numericAmount <= 0) {
    res.status(400);
    throw new Error('معرف مستخدم أو مبلغ غير صالح.');
  }
  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error('المستخدم غير موجود.');
  }
  user.balance += numericAmount;
  user.transactions.push({
    type: 'credit', amountUSD: numericAmount, currency: 'USD',
    createdBy: req.user._id, note: 'أضاف المدير الرصيد يدويًا',
  });
  await user.save();
  res.status(200).json({
    message: `تمت إضافة رصيد ${numericAmount} بنجاح إلى ${user.name}. الرصيد الجديد: ${user.balance}`,
  });
});

module.exports = {
  authUser,
  registerUser,
  verifyOtp,
  forgotPassword,
  resetPassword,
  getUserProfile,
  updateUserProfile,
  changePassword,
  addBalance,
  getUsers,
  deleteUser,
  getUserById,
  updateUser,
};