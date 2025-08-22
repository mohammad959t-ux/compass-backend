// middleware/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// التأكد من وجود مجلدات الرفع
const uploadsDir = path.join(__dirname, '../uploads');
const receiptsDir = path.join(__dirname, '../uploads/receipts');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
if (!fs.existsSync(receiptsDir)) fs.mkdirSync(receiptsDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, receiptsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `receipt-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new Error('يرجى رفع صور فقط'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 1024 * 1024 * 5 }, // 5MB limit
});

module.exports = upload;