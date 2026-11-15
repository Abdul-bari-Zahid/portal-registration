const path = require('path');
require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  mongoUri: process.env.MONGODB_URI || 'memory',
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback_dev_secret_please_change_in_production_12345',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  cookie: {
    secret: process.env.COOKIE_SECRET || 'cookie_secret_fallback_1234567890',
    name: 'admin_auth_token',
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  },
  admin: {
    email: (process.env.ADMIN_EMAIL || 'admin@eventportal.com').toLowerCase().trim(),
    initialPassword: process.env.ADMIN_INITIAL_PASSWORD || 'AdminSecurePass!2026',
  },
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  serverUrl: process.env.SERVER_URL || 'http://localhost:5000',
  upload: {
    maxSizeMb: parseInt(process.env.UPLOAD_MAX_SIZE_MB, 10) || 5,
    dir: path.resolve(__dirname, '../../', process.env.UPLOAD_DIR || 'private_uploads'),
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  },
  event: {
    name: process.env.EVENT_NAME || 'Uraan Trip 2026',
    date: process.env.EVENT_DATE || '11/22/2026',
    location: process.env.EVENT_LOCATION || 'International Convention Center, Hall A',
  },
  departments: [
    'BS',
    'CS',
    'BBA',
    'A&C',
  ],
};

module.exports = config;
