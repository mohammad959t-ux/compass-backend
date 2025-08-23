const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const { cloudinary } = require('../utils/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'projects', // مجلد الصور
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  },
});

const upload = multer({ storage });

module.exports = upload;
