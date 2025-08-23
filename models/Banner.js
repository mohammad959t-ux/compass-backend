const mongoose = require('mongoose');

const bannerSchema = mongoose.Schema(
  {
    imageUrl: {
      type: String,
      required: true,
    },
    offerLink: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Banner', bannerSchema);
