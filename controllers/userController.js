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
    body {
      font-family: Arial, sans-serif;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .container {
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      padding-bottom: 20px;
    }
    .logo {
      max-width: 150px;
    }
    .content {
      text-align: center;
      padding: 20px 0;
    }
    .otp-code {
      font-size: 32px;
      font-weight: bold;
      color: #333333;
      background-color: #f0f0f0;
      padding: 15px 25px;
      display: inline-block;
      border-radius: 8px;
      margin: 20px 0;
      letter-spacing: 5px;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: #777777;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://compass-backend-87n1.onrender.com/COMPASS%20NEW%20LOGO-01.png" alt="Your Company Logo" class="logo">
    </div>
    <div class="content">
      <h2>مرحباً،</h2>
      <p>يستخدم رمز التحقق لمرة واحدة لتأكيد حسابك. يرجى إدخال الرمز أدناه لإتمام العملية:</p>
      <div class="otp-code">
        {{otp_code}}
      </div>
      <p>إذا لم تكن أنت من طلب هذا الرمز، فيرجى تجاهل هذه الرسالة.</p>
    </div>
    <div class="footer">
      <p>&copy; 2025 Compass Digital Services. All rights reserved.</p>
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
  const otpExpires = Date.now() + 24 * 60 * 60 * 1000; // يوم كامل
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

  const finalEmailHtml = emailTemplate.replace('{{otp_code}}', otp);

  try {
    const data = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: 'رمز التحقق لتفعيل حسابك',
      html: finalEmailHtml,
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
    _id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin,
    balance: user.balance, token: generateToken(user._id),
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
      _id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin,
      balance: user.balance, token: generateToken(user._id),
    });
  } else {
    res.status(401);
    throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
  }
});

const forgotPassword = asyncHandler(async (req, res) => {
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

const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).select('-password');
  res.json(users);
});

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
