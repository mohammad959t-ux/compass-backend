const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// --- إنشاء مستخدم / تعديل كلمة المرور موجودة بالفعل (addUser) ---

// @desc    Admin يغير كلمة مرور مستخدم موجود
// @route   PUT /api/admin/change-password/:id
// @access  Private/Admin
const adminChangePassword = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    res.status(400);
    throw new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
  }

  const user = await User.findById(id);
  if (!user) {
    res.status(404);
    throw new Error('المستخدم غير موجود');
  }

  // تشفير كلمة المرور الجديدة
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);

  await user.save();

  res.status(200).json({ message: 'تم تحديث كلمة المرور بنجاح' });
});

module.exports = { addUser, adminChangePassword };
