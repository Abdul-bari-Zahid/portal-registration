const path = require('path');
const os = require('os');
require('dotenv').config();

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  mongoUri:
    process.env.MONGODB_URI ||
    'mongodb+srv://bariblogger6_db_user:k8L1azZkVcua7IZ0@cluster0.jiwdcab.mongodb.net/',
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback_dev_secret_please_change_in_production_12345',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  cookie: {
    secret: process.env.COOKIE_SECRET || 'cookie_secret_fallback_1234567890',
    name: 'admin_auth_token',
    options: {
      httpOnly: true,
      secure: isServerless || process.env.NODE_ENV === 'production',
      sameSite: isServerless || process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  },
  admin: {
    email: (process.env.ADMIN_EMAIL || 'admin@eventportal.com').toLowerCase().trim(),
    initialPassword: process.env.ADMIN_INITIAL_PASSWORD || 'AdminSecurePass!2026',
  },
  clientUrl: process.env.CLIENT_URL || 'https://portal-registration-m897.vercel.app',
  serverUrl: process.env.SERVER_URL || 'https://portal-registration-bk.vercel.app',
  upload: {
    maxSizeMb: parseInt(process.env.UPLOAD_MAX_SIZE_MB, 10) || 5,
    dir: isServerless
      ? path.join(os.tmpdir(), 'private_uploads')
      : path.resolve(__dirname, '../../', process.env.UPLOAD_DIR || 'private_uploads'),
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
