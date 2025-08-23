const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    coverImage: {
      type: String,
      required: true
    },
    images: [String], // صور إضافية
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    details: [String], // تفاصيل المشروع
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Project', projectSchema);