const express = require('express');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const expressLayouts = require('express-ejs-layouts');
require('dotenv').config();

// Initialize Database
const db = require('./config/database');

// Import Middlewares
const { attachUserToViews } = require('./middlewares/authMiddleware');

// Import Routes
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const courseRoutes = require('./routes/courseRoutes');
const orderRoutes = require('./routes/orderRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const aiApiRoutes = require('./routes/aiApiRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine setup (EJS + Layouts)
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Static assets
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Body parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Session config
app.use(session({
  secret: process.env.SESSION_SECRET || 'elearning_secret_key_2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
  }
}));

// Flash message & current user helpers
app.use(attachUserToViews);

// Mount AI & Automation REST API (Public Discovery + Protected Endpoints)
app.use('/api/v1', aiApiRoutes);

// Mount Web Application Routes
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/orders', orderRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/', courseRoutes); // Catalog, course detail, classroom

// Error 404 handler
app.use((req, res) => {
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({ success: false, error: 'Endpoint API tidak ditemukan' });
  }
  res.status(404).render('partials/404', { title: 'Halaman Tidak Ditemukan' });
});

// Start server
app.listen(PORT, () => {
  console.log(`⚡ Server E-Learning berjalan di: http://localhost:${PORT}`);
  console.log(`🔐 Admin default: admin@elearning.com / admin123`);
  console.log(`🤖 AI Schema Discovery: http://localhost:${PORT}/api/v1/schema`);
});
