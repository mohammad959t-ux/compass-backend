// controllers/walletController.js
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

// Admin يضيف رصيد للمستخدم
const creditUserWallet = asyncHandler(async (req, res) => {
  const { userId, amount, currency, note } = req.body;

  if (!userId || !amount || !currency) {
    res.status(400);
    throw new Error('userId, amount, and currency are required');
  }

  // تعديل سعر الصرف يدويًا
  const exchangeRates = { USD: 1, IQD: 0.00068, SYP: 0.00039 };
  const rate = exchangeRates[currency];
  if (!rate) {
    res.status(400);
    throw new Error('Unsupported currency');
  }

  const amountUSD = amount * rate;

  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // إضافة الرصيد
  user.balance += amountUSD;

  // تسجيل العملية في transactions
  user.transactions.push({
    type: 'credit',
    amountUSD,
    originalAmount: amount,
    currency,
    createdBy: req.user._id,
    note: note || 'Manual top-up by Admin',
  });

  await user.save();
  res.json({ message: 'User wallet credited successfully', balance: user.balance });
});

module.exports = { creditUserWallet };
