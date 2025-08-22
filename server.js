const cors = require('cors');
const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');

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
const receiptRoutes = require('./routes/receiptRoutes'); // <--- إضافة
const clientRoutes = require('./routes/clientRoutes');

dotenv.config();

const app = express();

// Middlewares
app.use(express.json());
app.use(cors());

// ** دعم عرض الملفات المرفوعة **
app.use('/uploads', express.static(path.join(__dirname, '/uploads')));

// ربط المسارات
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/category', categoryRoutes);
app.use('/api/wallet/receipts', receiptRoutes); // <--- إضافة
app.use('/api/clients', clientRoutes);
// Route تجريبي
app.get('/', (req, res) => {
  res.send('API is running...');
});

// PORT
const PORT = process.env.PORT || 5000;

// الاتصال بـ MongoDB وتشغيل السيرفر
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected successfully! 🚀');

    // تشغيل Cron jobs لو موجودة
    try {
      require('./utils/cron');
      console.log('Cron jobs loaded successfully.');
    } catch (err) {
      console.log('No cron jobs to load.');
    }

    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error(`Error connecting to MongoDB: ${err.message}`);
    process.exit(1);
  });
