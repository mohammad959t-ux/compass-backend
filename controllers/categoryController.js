const asyncHandler = require('express-async-handler');
const Category = require('../models/Category');
const { uploadImageToCloud } = require('../utils/cloudinary'); // دالة رفع الصور للسحابة

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

  let imageUrl = null;
  if (req.file) {
    imageUrl = await uploadImageToCloud(req.file);
  }

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
  if (!category) { 
    res.status(404); 
    throw new Error('Category not found'); 
  }

  if (req.body.name) category.name = req.body.name;

  if (req.file) {
    const imageUrl = await uploadImageToCloud(req.file);
    category.imageUrl = imageUrl;
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
  if (!category) { 
    res.status(404); 
    throw new Error('Category not found'); 
  }

  await category.deleteOne();
  res.json({ message: 'Category deleted successfully' });
});

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
};
