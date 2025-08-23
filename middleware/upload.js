const multer = require('multer');
const path = require('path');
const fs = require('fs');

const createUploadMiddleware = (directory) => {
  const destinationDir = path.join(__dirname, '..', 'uploads', directory);

  // التأكد من أن مجلد الوجهة موجود، وإنشاؤه إذا لم يكن كذلك
  if (!fs.existsSync(destinationDir)) {
    fs.mkdirSync(destinationDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, destinationDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
    },
  });

  const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('نوع الملف غير مدعوم. يرجى رفع صور فقط (JPG, PNG, GIF, WEBP).'), false);
    }
  };

  const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
      fileSize: 1024 * 1024 * 5 // 5 ميغابايت
    },
  });

  return upload;
};

module.exports = createUploadMiddleware;