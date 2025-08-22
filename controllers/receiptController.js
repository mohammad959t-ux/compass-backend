const asyncHandler = require('express-async-handler');
const Receipt = require('../models/Receipt');
const User = require('../models/User');
const path = require('path');

// رفع إيصال
const uploadReceipt = asyncHandler(async (req, res) => {
  const { amount, currency, note } = req.body;
  if (!req.file) {
    res.status(400);
    throw new Error('Receipt file is required');
  }
  if (!amount || !currency) {
    res.status(400);
    throw new Error('Amount and currency are required');
  }

  const receipt = await Receipt.create({
    user: req.user._id,
    fileUrl: `/uploads/receipts/${req.file.filename}`,
    amount,
    currency,
    note
  });

  res.status(201).json({ message: 'Receipt uploaded successfully', receipt });
});

// Admin: مراجعة الإيصال
const reviewReceipt = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // approved | rejected

  const receipt = await Receipt.findById(id);
  if (!receipt) {
    res.status(404);
    throw new Error('Receipt not found');
  }

  if (action === 'approved') {
    // شحن الرصيد للمستخدم
    const exchangeRates = { USD: 1, IQD: 0.00068, SYP: 0.00039 };
    const rate = exchangeRates[receipt.currency];
    const amountUSD = receipt.amount * rate;

    const user = await User.findById(receipt.user);
    user.balance += amountUSD;
    user.transactions.push({
      type: 'credit',
      amountUSD,
      originalAmount: receipt.amount,
      currency: receipt.currency,
      createdBy: req.user._id,
      note: receipt.note || 'Top-up via receipt approval',
    });
    await user.save();
    receipt.status = 'approved';
  } else if (action === 'rejected') {
    receipt.status = 'rejected';
  } else {
    res.status(400);
    throw new Error('Invalid action');
  }

  receipt.reviewedBy = req.user._id;
  await receipt.save();

  res.json({ message: `Receipt ${receipt.status}` });
});

// عرض كل الإيصالات (Admin)
const getReceipts = asyncHandler(async (req, res) => {
  const receipts = await Receipt.find().populate('user', 'name email');
  res.json(receipts);
});

module.exports = { uploadReceipt, reviewReceipt, getReceipts };
