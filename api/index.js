const app = require('../backend/src/app');
const { connectDB } = require('../backend/src/config/db');
const Admin = require('../backend/src/models/Admin');
const config = require('../backend/src/config/config');

let isConnected = false;

module.exports = async (req, res) => {
  if (!isConnected) {
    try {
      await connectDB();
      const adminCount = await Admin.countDocuments();
      if (adminCount === 0) {
        const admin = new Admin({
          email: config.admin.email,
          passwordHash: config.admin.initialPassword,
          role: 'ADMIN',
        });
        await admin.save();
      }
      isConnected = true;
    } catch (err) {
      console.error('Database connection error in root serverless function:', err);
    }
  }
  return app(req, res);
};
