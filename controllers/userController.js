const asyncHandler = require('express-async-handler');
const { validationResult } = require('express-validator');
const crypto = require('crypto');
const { Resend } = require('resend');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

const resend = new Resend(process.env.RESEND_API_KEY);

const emailTemplate = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin:0; padding:0; font-family: Arial, sans-serif; background-color: #F5F5F5; }
    .container { width:100%; max-width:600px; margin:0 auto; background-color:#01193F; padding:20px; border-radius:12px; color:#FFFFFF; box-sizing:border-box; }
    .header { text-align:center; padding-bottom:20px; }
    .logo { max-width:150px; display:block; margin:0 auto; }
    .content { text-align:center; padding:20px 10px; }
    h2 { font-size:24px; margin-bottom:10px; }
    p { font-size:16px; line-height:1.5; }
    .otp-code {
      font-size:36px;
      font-weight:bold;
      color:#01193F;
      background: linear-gradient(90deg, #43C6E8, #67C23A 80%);
      padding:15px 25px;
      display:inline-block;
      border-radius:12px;
      margin:20px 0;
      letter-spacing:6px;
    }
    .footer { text-align:center; font-size:12px; color:#F5F5F5; margin-top:20px; }
    @media screen and (max-width:480px) {
      h2 { font-size:20px; }
      p { font-size:14px; }
      .otp-code { font-size:28px; padding:10px 20px; letter-spacing:4px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://res.cloudinary.com/dekhg6yje/image/upload/v1756047144/compass_logo-01_unzgnp.png" alt="Compass Logo" class="logo">
    </div>
    <div class="content">
      <h2>مرحباً،</h2>
      <p>رمز التحقق لمرة واحدة لتأكيد حسابك:</p>
      <div class="otp-code">{{otp_code}}</div>
      <p>إذا لم تطلب هذا الرمز، يرجى تجاهل الرسالة.</p>
    </div>
    <div class="footer">
      &copy; 2025 Compass Digital Services. جميع الحقوق محفوظة.
    </div>
  </div>
</body>
</html>`;

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
  const otpExpires = Date.now() + 24 * 60 * 60 * 1000;

  if (user && !user.isVerified) {
    user.password = password;
    user.name = name;
    user.otp = otp;
    user.otpExpires = otpExpires;
  } else {
    user = new User({ name, email, password, otp, otpExpires });
  }

  await user.save();
  const finalEmailHtml = emailTemplate.replace('{{otp_code}}', otp);

  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: 'رمز التحقق لتفعيل حسابك',
      html: finalEmailHtml,
    });
    res.status(201).json({
      success: true,
      message: `تم إرسال رمز التحقق إلى ${user.email}. يرجى التحقق من بريدك.`,
    });
  } catch (error) {
    res.status(500);
    throw new Error('فشل إرسال بريد التحقق. يرجى التأكد من صحة البريد والمحاولة مرة أخرى.');
  }
});

const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    res.status(400);
    throw new Error('الرجاء إدخال البريد الإلكتروني والرمز.');
  }

  const trimmedOtp = otp.trim();
  const user = await User.findOne({ email, otp: trimmedOtp, otpExpires: { $gt: Date.now() } });
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
    _id: user._id,
    name: user.name,
    email: user.email,
    isAdmin: user.isAdmin,
    balance: user.balance,
    token: generateToken(user._id),
  });
});

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
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      balance: user.balance,
      token: generateToken(user._id),
    });
  } else {
    res.status(401);
    throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
  }
});

// --- دوال المستخدمين ---
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  if (user) {
    res.json(user);
  } else {
    res.status(404);
    throw new Error('المستخدم غير موجود');
  }
});

const updateUserProfile = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400);
    throw new Error(errors.array()[0].msg);
  }

  const user = await User.findById(req.user._id);
  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      isAdmin: updatedUser.isAdmin,
      balance: updatedUser.balance,
    });
  } else {
    res.status(404);
    throw new Error('المستخدم غير موجود');
  }
});

const changePassword = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400);
    throw new Error(errors.array()[0].msg);
  }

  let user;
  if (req.params.id) {
    user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error('المستخدم غير موجود');
    }
    user.password = req.body.newPassword;
    await user.save();
    res.json({ message: 'تم تغيير كلمة المرور بنجاح.' });
  } else {
    const { oldPassword, newPassword } = req.body;
    user = await User.findById(req.user._id);
    if (user && (await user.matchPassword(oldPassword))) {
      user.password = newPassword;
      await user.save();
      res.json({ message: 'تم تغيير كلمة المرور بنجاح.' });
    } else {
      res.status(401);
      throw new Error('كلمة المرور القديمة غير صحيحة');
    }
  }
});

// --- دوال إعادة تعيين كلمة المرور ---
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    res.status(404);
    throw new Error('لا يوجد مستخدم بهذا البريد الإلكتروني.');
  }

  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  const message = `
    <p>لقد طلبت إعادة تعيين كلمة المرور.</p>
    <p>الرجاء النقر على هذا الرابط لإعادة تعيين كلمة مرورك: </p>
    <a href="${resetUrl}" target="_blank">${resetUrl}</a>
    <p>هذا الرابط صالح لمدة 10 دقائق فقط.</p>
  `;

  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'إعادة تعيين كلمة المرور',
      html: message,
    });
    res.status(200).json({ success: true, message: 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.' });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    res.status(500);
    throw new Error('فشل إرسال البريد الإلكتروني. يرجى المحاولة مرة أخرى لاحقًا.');
  }
});

const resetPassword = asyncHandler(async (req, res) => {
  const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    res.status(400);
    throw new Error('الرمز غير صالح أو انتهت صلاحيته.');
  }

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  res.json({ message: 'تم إعادة تعيين كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن.' });
});

// --- دوال المدير ---
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).select('-password');
  res.json(users);
});

const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (user) {
    if (user.isAdmin) {
      res.status(400);
      throw new Error('لا يمكن حذف المستخدم المدير');
    }
    await User.deleteOne({ _id: user._id });
    res.json({ message: 'تم حذف المستخدم بنجاح' });
  } else {
    res.status(404);
    throw new Error('المستخدم غير موجود');
  }
});

const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (user) {
    res.json(user);
  } else {
    res.status(404);
    throw new Error('المستخدم غير موجود');
  }
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.isAdmin = req.body.isAdmin !== undefined ? req.body.isAdmin : user.isAdmin;
    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      isAdmin: updatedUser.isAdmin,
      balance: updatedUser.balance,
    });
  } else {
    res.status(404);
    throw new Error('المستخدم غير موجود');
  }
});

const addBalance = asyncHandler(async (req, res) => {
  const { userId, amount } = req.body;
  if (!userId || amount === undefined || amount <= 0) {
    res.status(400);
    throw new Error('الرجاء إدخال بيانات صحيحة: معرف المستخدم والمبلغ');
  }

  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error('المستخدم غير موجود');
  }

  user.balance += amount;
  await user.save();
  res.json({ message: 'تمت إضافة الرصيد بنجاح', currentBalance: user.balance });
});

const addUser = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400);
    throw new Error(errors.array()[0].msg);
  }

  const { name, email, password, isAdmin = false, balance = 0 } = req.body;
  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('هذا البريد الإلكتروني مسجل بالفعل');
  }

  const user = await User.create({ name, email, password, isAdmin, balance, isVerified: true });

  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      balance: user.balance,
      isVerified: user.isVerified,
    });
  } else {
    res.status(400);
    throw new Error('بيانات المستخدم غير صالحة');
  }
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
  addUser,
};
