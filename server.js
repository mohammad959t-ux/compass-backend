// ===============================
// server.js
// ===============================

// استيراد المكتبات الأساسية والأمنية
const cors = require('cors');
const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// استدعاء ملفات المسارات
const userRoutes = require('./routes/userRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const orderRoutes = require('./routes/orderRoutes');
const bannerRoutes = require('./routes/bannerRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const walletRoutes = require('./routes/walletRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const receiptRoutes = require('./routes/receiptRoutes');
const clientRoutes = require('./routes/clientRoutes');
// مسار المشاريع
const projectRoutes = require('./routes/projectRoutes');
// مسار Admin Panel
const adminRoutes = require('./routes/adminRoutes');

// تفعيل متغيرات البيئة
dotenv.config();

// إنشاء تطبيق Express
const app = express();

// ===============================
// Middlewares الأمان
// ===============================

// السماح بالثقة في البروكسي (مهم عند استخدام Render أو Heroku)
app.set('trust proxy', 1);

// Helmet لتعيين رؤوس HTTP الأمنية تلقائيًا
app.use(helmet());

// إعداد محدودية معدل الطلبات لمنع هجمات القوة الغاشمة
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 200, // الحد الأقصى للطلبات
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes',
});

// تطبيق محدد معدل الطلبات على جميع مسارات /api
app.use('/api', apiLimiter);

// تفعيل CORS
app.use(cors());

// ===============================
// Middlewares أساسية
// ===============================

// تحليل الـ JSON القادم في جسم الطلب
app.use(express.json());

// دعم عرض الملفات المرفوعة
app.use('/uploads', express.static(path.join(__dirname, '/uploads')));

// ===============================
// ربط المسارات (API Routes)
// ===============================
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/category', categoryRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/admin', adminRoutes); // مسارات Admin Panel

// Route أساسي للتحقق من أن الـ API يعمل
app.get('/', (req, res) => {
  res.send('API is running successfully...');
});

// ===============================
// معالج الأخطاء المخصص
// يجب أن يكون بعد كل المسارات
// ===============================
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

// ===============================
// إعداد المنفذ والاتصال بقاعدة البيانات
// ===============================
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected successfully! 🚀');

    // تشغيل الخادم بعد الاتصال الناجح بقاعدة البيانات
    app.listen(PORT, () =>
      console.log(
        `Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`
      )
    );
  })
  .catch((err) => {
    console.error(`Error connecting to MongoDB: ${err.message}`);
    process.exit(1); // إيقاف العملية عند فشل الاتصال
  });
