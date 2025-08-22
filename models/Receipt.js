const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fileUrl: { type: String, required: true },
  amount: { type: Number, required: true }, // المبلغ اللي المستخدم حوله
  currency: { type: String, required: true },
  note: { type: String },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // Admin
});

module.exports = mongoose.model('Receipt', receiptSchema);
