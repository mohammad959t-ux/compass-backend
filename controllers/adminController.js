// controllers/adminController.js
const User = require('../models/User');
const asyncHandler = require('express-async-handler');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');

// --- إضافة مستخدم جديد (Admin) ---
const addUser = asyncHandler(async (req, res) => {
  // تحقق من البيانات
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }

  const { name, email, password, isAdmin } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Please fill all required fields.' });
  }

  // تحقق إذا كان البريد موجود مسبقًا
  const userExists = await User.findOne({ email });
  if (userExists) {
    return res.status(400).json({ message: 'Email is already registered.' });
  }

  // إنشاء المستخدم الجديد
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    isAdmin: isAdmin || false,
  });

  if (user) {
    res.status(201).json({ message: 'User added successfully', user: { id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin } });
  } else {
    res.status(400).json({ message: 'Failed to create user.' });
  }
});

// --- تغيير كلمة مرور مستخدم (Admin) ---
const adminChangePassword = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  }

  const user = await User.findById(id);
  if (!user) return res.status(404).json({ message: 'User not found.' });

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  res.json({ message: 'Password updated successfully.' });
});

module.exports = { addUser, adminChangePassword };
