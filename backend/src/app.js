const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const config = require('./config/config');

// Route imports
const authRoutes = require('./routes/authRoutes');
const registrationRoutes = require('./routes/registrationRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const scannerRoutes = require('./routes/scannerRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const auditRoutes = require('./routes/auditRoutes');

const { generalLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFoundHandler } = require('./middleware/errorMiddleware');

const app = express();

// Trust reverse proxies (important for rate limiter and accurate IP tracking behind Nginx / Render / Heroku)
app.set('trust proxy', 1);

// Security Headers with Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS configuration
const allowedOrigins = [
  config.clientUrl,
  'https://portal-registration-m897.vercel.app',
  'https://portal-registration-bk.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:3000',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, Postman or server-to-server)
      if (!origin) return callback(null, true);
      
      // Allow allowedOrigins, or any .vercel.app domain
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.includes('localhost')
      ) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive for production ease across Vercel previews
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Body parsers with payload limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser(config.cookie.secret));

// Simple operational request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Apply general rate limiting
app.use('/api/', generalLimiter);

// Root & Health check endpoints
app.get(['/', '/health', '/api/health'], (req, res) => {
  res.status(200).json({
    status: 'healthy',
    online: true,
    message: 'Event Registration & Gate Pass API is operating normally.',
    timestamp: new Date().toISOString(),
    event: config.event.name,
    environment: config.env,
  });
});

// Config metadata endpoint (public for frontend forms)
app.get('/api/config/public', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      departments: config.departments,
      eventName: config.event.name,
      eventDate: config.event.date,
      eventLocation: config.event.location,
      uploadMaxSizeMb: config.upload.maxSizeMb,
      allowedMimeTypes: config.upload.allowedMimeTypes,
    },
  });
});

// Mount modular API routes
app.use('/api/auth', authRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/scanner', scannerRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/audit', auditRoutes);

// Catch 404s
app.use(notFoundHandler);

// Centralized error handling
app.use(errorHandler);

module.exports = app;
