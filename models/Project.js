const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  coverImage: { type: String, required: true }, // رابط الصورة الرئيسية
  images: [String], // روابط الصور الإضافية
  title: { type: String, required: true },
  description: { type: String, required: true },
  details: [String], // تفاصيل المشروع
  createdBy: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
