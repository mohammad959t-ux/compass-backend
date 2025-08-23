const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadImageToCloud = async (file) => {
  try {
    // التحقق من وجود الملف
    if (!file) {
      throw new Error('No file provided');
    }

    // استخدام مسار الملف المؤقت من Multer
    const result = await cloudinary.uploader.upload(file.path, {
      folder: 'projects',
      resource_type: 'auto',
      transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ]
    });

    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Cloudinary upload failed: ' + error.message);
  }
};

// دالة لحذف الصورة من Cloudinary
const deleteImageFromCloud = async (publicId) => {
  try {
    if (!publicId) return;
    
    // استخراج public_id من URL إذا كان URL كامل
    let id = publicId;
    if (publicId.includes('cloudinary.com')) {
      const urlParts = publicId.split('/');
      const filename = urlParts[urlParts.length - 1];
      id = filename.split('.')[0];
    }
    
    await cloudinary.uploader.destroy(id);
  } catch (error) {
    console.error('Cloudinary delete error:', error);
  }
};

module.exports = { cloudinary, uploadImageToCloud, deleteImageFromCloud };
