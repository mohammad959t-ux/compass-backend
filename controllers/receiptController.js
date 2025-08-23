const asyncHandler = require('express-async-handler');
const Receipt = require('../models/Receipt');
const User = require('../models/User');
const { uploadImageToCloud } = require('../utils/cloudinary');

// @desc    Upload a new receipt
// @route   POST /api/receipts
// @access  Private
const uploadReceipt = asyncHandler(async (req, res) => {
  const { amount, currency, note } = req.body;

  if (!req.file) {
    res.status(400);
    throw new Error('ملف الإيصال (صورة) مطلوب');
  }
  if (!amount || !currency) {
    res.status(400);
    throw new Error('المبلغ والعملة مطلوبان');
  }

  // رفع الصورة على Cloudinary
  const fileUrl = await uploadImageToCloud(req.file);

  const receipt = await Receipt.create({
    user: req.user._id,
    fileUrl,
    amount: Number(amount),
    currency,
    note,
  });

  res.status(201).json({ message: 'تم رفع الإيصال بنجاح وسنقوم بمراجعته', receipt });
});

// @desc    Admin reviews a receipt
// @route   PUT /api/receipts/:id/review
// @access  Private/Admin
const reviewReceipt = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // 'approved' or 'rejected'

  const receipt = await Receipt.findById(id);
  if (!receipt) {
    res.status(404);
    throw new Error('الإيصال غير موجود');
  }
  
  if (receipt.status !== 'pending') {
    res.status(400);
    throw new Error(`لا يمكن مراجعة هذا الإيصال لأنه بحالة ${receipt.status}`);
  }

  if (action === 'approved') {
    const exchangeRates = { USD: 1, IQD: 0.00068, SYP: 0.00039 };
    const rate = exchangeRates[receipt.currency];
    if (!rate) {
      res.status(400);
      throw new Error(`عملة ${receipt.currency} غير مدعومة للتحويل.`);
    }
    const amountUSD = receipt.amount * rate;

    const user = await User.findById(receipt.user);
    user.balance += amountUSD;
    user.transactions.push({
      type: 'credit',
      amountUSD,
      originalAmount: receipt.amount,
      currency: receipt.currency,
      createdBy: req.user._id,
      note: receipt.note || 'شحن الرصيد عبر الموافقة على الإيصال',
    });
    await user.save();
    receipt.status = 'approved';
  } else if (action === 'rejected') {
    receipt.status = 'rejected';
  } else {
    res.status(400);
    throw new Error('الإجراء غير صالح. يجب أن يكون "approved" أو "rejected".');
  }

  receipt.reviewedBy = req.user._id;
  await receipt.save();

  res.json({ message: `تم ${action === 'approved' ? 'قبول' : 'رفض'} الإيصال بنجاح.` });
});

// @desc    Admin gets all receipts
// @route   GET /api/receipts
// @access  Private/Admin
const getReceipts = asyncHandler(async (req, res) => {
  const receipts = await Receipt.find({}).sort({ createdAt: -1 }).populate('user', 'name email');
  res.json(receipts);
});

// @desc    User gets their own receipts
// @route   GET /api/receipts/my-receipts
// @access  Private
const getUserReceipts = asyncHandler(async (req, res) => {
  const receipts = await Receipt.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(receipts);
});

module.exports = { uploadReceipt, reviewReceipt, getReceipts, getUserReceipts };
