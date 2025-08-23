const multer = require('multer');
const path = require('path');
const fs = require('fs');

// دالة لإنشاء middleware Multer ديناميكياً
const upload = (folder) => {
    // التأكد من أن مجلد الرفع موجود، وإذا لم يكن، يتم إنشاؤه
    const uploadDir = path.join(__dirname, '..', 'uploads', folder);
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    // إعداد كيفية تخزين الملفات (المجلد + اسم الملف)
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, uploadDir); // حفظ الملفات في المجلد المحدد
        },
        filename: (req, file, cb) => {
            // إنشاء اسم فريد للملف لمنع الكتابة فوق الملفات الموجودة
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
        },
    });

    // فلتر الملفات
    const fileFilter = (req, file, cb) => {
        // قائمة بأنواع الملفات المسموح بها
        const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

        if (allowedMimeTypes.includes(file.mimetype)) {
            // اسمح للملف بالمرور
            cb(null, true);
        } else {
            // ارفض الملف وأرسل رسالة خطأ
            cb(new Error('نوع الملف غير مدعوم. يرجى رفع صور فقط (JPG, PNG, GIF, WEBP).'), false);
        }
    };

    // تجميع إعدادات Multer
    return multer({
        storage: storage,
        fileFilter: fileFilter,
        limits: {
            fileSize: 1024 * 1024 * 5 // حد أقصى لحجم الملف: 5 ميغابايت
        },
    });
};

module.exports = upload;
