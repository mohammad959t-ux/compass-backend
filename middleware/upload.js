// middleware/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// التأكد من أن مجلدات الرفع موجودة، وإذا لم تكن كذلك، يتم إنشاؤها
const uploadsDir = path.join(__dirname, '../uploads');
const receiptsDir = path.join(__dirname, '../uploads/receipts');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(receiptsDir)) {
  fs.mkdirSync(receiptsDir, { recursive: true });
}


// إعداد كيفية تخزين الملفات (المجلد + اسم الملف)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, receiptsDir); // حفظ الملفات في مجلد 'uploads/receipts'
  },
  filename: (req, file, cb) => {
    // إنشاء اسم فريد للملف لمنع الكتابة فوق الملفات الموجودة
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `receipt-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

// ✅✅✅ تعديل مهم: فلتر جديد وأكثر قوة للملفات
const fileFilter = (req, file, cb) => {
  // قائمة بأنواع الملفات المسموح بها (يمكنك إضافة المزيد مثل 'pdf' إذا أردت)
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  if (allowedMimeTypes.includes(file.mimetype)) {
    // اسمح للملف بالمرور إذا كان نوعه ضمن القائمة المسموح بها
    cb(null, true);
  } else {
    // ارفض الملف وأرسل رسالة خطأ واضحة
    cb(new Error('نوع الملف غير مدعوم. يرجى رفع صور فقط (JPG, PNG, GIF, WEBP).'), false);
  }
};


// تجميع إعدادات Multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { 
    fileSize: 1024 * 1024 * 5 // حد أقصى لحجم الملف: 5 ميغابايت
  },
});

module.exports = upload;