const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadImageToCloud = async (filePath) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'projects',
    });
    return result.secure_url;
  } catch (error) {
    throw new Error('Cloudinary upload failed: ' + error.message);
  }
};

module.exports = { cloudinary, uploadImageToCloud };
