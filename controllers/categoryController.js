const asyncHandler = require('express-async-handler');
const Category = require('../models/Category');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// ---------------------------------------------
// التأكد من وجود مجلد uploads/categories
// ---------------------------------------------
const categoriesDir = path.join(__dirname, '../uploads/categories');
if (!fs.existsSync(categoriesDir)) {
  fs.mkdirSync(categoriesDir, { recursive: true });
  console.log('Created uploads/categories folder');
}

// ---------------------------------------------
// Multer setup for category images
// ---------------------------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, categoriesDir),
  filename: (req, file, cb) => {
    cb(null, `category-${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage });

// ---------------------------------------------
// جلب كل الفئات
// ---------------------------------------------
const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().lean();
  res.json(categories);
});

// ---------------------------------------------
// إنشاء فئة جديدة
// ---------------------------------------------
const createCategory = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name) {
    res.status(400);
    throw new Error('Category name is required');
  }

  const imageUrl = req.file ? `/uploads/categories/${req.file.filename}` : null;

  const category = new Category({ name, imageUrl });
  const savedCategory = await category.save();
  res.status(201).json(savedCategory);
});

// ---------------------------------------------
// تعديل فئة
// ---------------------------------------------
const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const category = await Category.findById(id);
  if (!category) { res.status(404); throw new Error('Category not found'); }

  if (req.body.name) category.name = req.body.name;

  if (req.file) {
    // حذف الصورة القديمة إذا موجودة
    if (category.imageUrl) {
      const oldPath = path.join('.', category.imageUrl);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    category.imageUrl = `/uploads/categories/${req.file.filename}`;
  }

  const updatedCategory = await category.save();
  res.json(updatedCategory);
});

// ---------------------------------------------
// حذف فئة
// ---------------------------------------------
const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const category = await Category.findById(id);
  if (!category) { res.status(404); throw new Error('Category not found'); }

  // حذف الصورة إذا موجودة
  if (category.imageUrl) {
    const oldPath = path.join('.', category.imageUrl);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  await category.deleteOne();
  res.json({ message: 'Category deleted successfully' });
});

module.exports = {
  upload,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
};
