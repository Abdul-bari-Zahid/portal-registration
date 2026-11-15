const app = require('../src/app');
const { connectDB } = require('../src/config/db');
const Admin = require('../src/models/Admin');
const config = require('../src/config/config');

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
      console.error('Database connection error in Vercel serverless function:', err);
    }
  }
  return app(req, res);
};
