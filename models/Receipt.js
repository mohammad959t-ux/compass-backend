// models/Receipt.js
const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fileUrl: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true, enum: ['USD', 'IQD', 'SYP'] }, // من الجيد تحديد العملات
  note: { type: String },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // Admin
}, {
  timestamps: true // استخدام timestamps أفضل من createdAt اليدوي
});

module.exports = mongoose.model('Receipt', receiptSchema);