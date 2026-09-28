const express = require('express');
const helmet = require('helmet');
const hpp = require('hpp');
const morgan = require('morgan');

const { corsMiddleware, globalRateLimiter, sanitizeInput } = require('./middleware/security');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const transactionRoutes = require('./routes/transaction.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const settingsRoutes = require('./routes/settings.routes');
const userRoutes = require('./routes/user.routes');
const categoryRoutes = require('./routes/category.routes');

const app = express();

// Di belakang reverse proxy (Railway/Render/Nginx) agar rate-limit & IP terbaca benar.
app.set('trust proxy', 1);

// ---- Keamanan dasar ----
app.use(helmet());                 // set berbagai security header (X-Frame-Options, CSP dasar, dll)
app.use(corsMiddleware);           // whitelist domain frontend
app.use(hpp());                    // cegah HTTP Parameter Pollution
app.use(globalRateLimiter);        // batasi request per menit per IP
app.use(express.json({ limit: '1mb' }));
app.use(sanitizeInput);            // bersihkan payload dari kemungkinan XSS

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ---- Health check (untuk load balancer / uptime monitor) ----
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ---- API Routes ----
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
