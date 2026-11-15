const app = require('../backend/src/app');
const { connectDB } = require('../backend/src/config/db');
const Admin = require('../backend/src/models/Admin');
const config = require('../backend/src/config/config');

let isSeeded = false;

module.exports = async (req, res) => {
  // Allow health/public endpoints without waiting for DB if needed
  const isBypass = req.url === '/' || req.url === '/health' || req.url === '/api/health';

  try {
    await connectDB();
    if (!isSeeded) {
      try {
        const adminCount = await Admin.countDocuments();
        if (adminCount === 0) {
          const admin = new Admin({
            email: config.admin.email,
            passwordHash: config.admin.initialPassword,
            role: 'ADMIN',
          });
          await admin.save();
        }
        isSeeded = true;
      } catch (seedErr) {
        console.warn('Admin seed check warning:', seedErr.message);
      }
    }
  } catch (err) {
    console.error('Database connection error in root serverless function:', err.message);
    if (!isBypass) {
      return res.status(503).json({
        success: false,
        message: `Database Connection Failed: ${err.message}. Please verify MongoDB Atlas Network Access has 0.0.0.0/0 (Allow access from anywhere) enabled.`,
        error: err.message,
      });
    }
  }

  return app(req, res);
};
