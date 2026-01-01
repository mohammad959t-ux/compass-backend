// ===============================
// server.js
// ===============================

// ط§ط³طھظٹط±ط§ط¯ ط§ظ„ظ…ظƒطھط¨ط§طھ ط§ظ„ط£ط³ط§ط³ظٹط© ظˆط§ظ„ط£ظ…ظ†ظٹط©
const cors = require('cors');
const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const { syncServicesTask } = require('./controllers/serviceController');

// ط§ط³طھط¯ط¹ط§ط، ظ…ظ„ظپط§طھ ط§ظ„ظ…ط³ط§ط±ط§طھ
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

// طھظپط¹ظٹظ„ ظ…طھط؛ظٹط±ط§طھ ط§ظ„ط¨ظٹط¦ط©
dotenv.config();

// ط¥ظ†ط´ط§ط، طھط·ط¨ظٹظ‚ Express
const app = express();

// ===============================
// Middlewares ط§ظ„ط£ظ…ط§ظ†
// ===============================

// ط§ظ„ط³ظ…ط§ط­ ط¨ط§ظ„ط«ظ‚ط© ظپظٹ ط§ظ„ط¨ط±ظˆظƒط³ظٹ
app.set('trust proxy', 1);

// Helmet ظ„طھط¹ظٹظٹظ† ط±ط¤ظˆط³ HTTP ط§ظ„ط£ظ…ظ†ظٹط©
app.use(helmet());

// ط¥ط¹ط¯ط§ط¯ ظ…ط­ط¯ط¯ ظ…ط¹ط¯ظ„ ط§ظ„ط·ظ„ط¨ط§طھ
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 ط¯ظ‚ظٹظ‚ط©
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes',
});
app.use('/api', apiLimiter);

// ===============================
// طھظپط¹ظٹظ„ CORS ط¨ط´ظƒظ„ ظ…ط­ط¯ط¯ ظ„ط¯ظˆظ…ظٹظ† ط§ظ„ظ€ Frontend
// ===============================
app.use(cors({
  origin: 'https://compass-admin-panel-f.vercel.app', // ط±ط§ط¨ط· ط§ظ„ظ€ frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ===============================
// Middlewares ط£ط³ط§ط³ظٹط©
// ===============================
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '/uploads')));

// ===============================
// ط±ط¨ط· ط§ظ„ظ…ط³ط§ط±ط§طھ (API Routes)
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

// Route ط£ط³ط§ط³ظٹ ظ„ظ„طھط­ظ‚ظ‚ ظ…ظ† ط£ظ† ط§ظ„ظ€ API ظٹط¹ظ…ظ„
app.get('/', (req, res) => {
  res.send('API is running successfully...');
});

// ===============================
// ظ…ط¹ط§ظ„ط¬ ط§ظ„ط£ط®ط·ط§ط، ط§ظ„ظ…ط®طµطµ
// ===============================
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

// ===============================
// ط¥ط¹ط¯ط§ط¯ ط§ظ„ظ…ظ†ظپط° ظˆط§ظ„ط§طھطµط§ظ„ ط¨ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ
// ===============================
const PORT = process.env.PORT || 5000;
const ENABLE_SERVICE_SYNC_CRON = (process.env.ENABLE_SERVICE_SYNC_CRON ?? 'true').toLowerCase() === 'true';
const SERVICE_SYNC_CRON = process.env.SERVICE_SYNC_CRON || '0 3 * * *';

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected successfully! ñ???');
    if (ENABLE_SERVICE_SYNC_CRON) {
      cron.schedule(SERVICE_SYNC_CRON, async () => {
        console.log('Running scheduled service sync...');
        try {
          const result = await syncServicesTask();
          console.log('Scheduled service sync completed.', result);
        } catch (error) {
          console.error('Scheduled service sync failed:', error.message);
        }
      });
      console.log(`Service sync cron scheduled: ${SERVICE_SYNC_CRON}`);
    }
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





