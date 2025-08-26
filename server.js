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
const projectRoutes = require('./routes/projectRoutes');
const adminRoutes = require('./routes/adminRoutes');

// تفعيل متغيرات البيئة
dotenv.config();

// إنشاء تطبيق Express
const app = express();

// ===============================
// Middlewares الأمان
// ===============================

// السماح بالثقة في البروكسي
app.set('trust proxy', 1);

// Helmet لتعيين رؤوس HTTP الأمنية
app.use(helmet());

// إعداد محدد معدل الطلبات
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes',
});
app.use('/api', apiLimiter);

// ===============================
// تفعيل CORS بشكل محدد لدومين الـ Frontend
// ===============================
app.use(cors({
  origin: 'https://compass-admin-panel-f.vercel.app/', // رابط الـ frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ===============================
// Middlewares أساسية
// ===============================
app.use(express.json());
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
app.use('/api/admin', adminRoutes);

// Route أساسي للتحقق من أن الـ API يعمل
app.get('/', (req, res) => {
  res.send('API is running successfully...');
});

// ===============================
// معالج الأخطاء المخصص
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
    app.listen(PORT, () =>
      console.log(
        `Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`
      )
    );
  })
  .catch((err) => {
    console.error(`Error connecting to MongoDB: ${err.message}`);
    process.exit(1);
  });
