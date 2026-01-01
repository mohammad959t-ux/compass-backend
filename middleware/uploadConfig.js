const multer = require('multer');

const DEFAULT_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const imageFileFilter = (req, file, cb) => {
  if (ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
    return;
  }
  cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
};

const createDiskUpload = (options = {}) => {
  const maxFileSizeBytes = Number(options.maxFileSizeBytes ?? DEFAULT_MAX_FILE_SIZE_BYTES);
  return multer({
    dest: 'uploads/',
    limits: { fileSize: maxFileSizeBytes },
    fileFilter: imageFileFilter,
  });
};

module.exports = { createDiskUpload };
