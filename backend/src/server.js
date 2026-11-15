const app = require('./app');
const config = require('./config/config');
const { connectDB, disconnectDB } = require('./config/db');
const Admin = require('./models/Admin');

const startServer = async () => {
  try {
    // 1. Connect Database
    await connectDB();

    // 2. Auto-initialize initial admin from environment variables if no admin exists
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      console.log('⚡ No admin account detected. Auto-seeding initial master admin...');
      const admin = new Admin({
        email: config.admin.email,
        passwordHash: config.admin.initialPassword,
        role: 'ADMIN',
      });
      await admin.save();
      console.log(`✅ Master Admin seeded successfully: ${config.admin.email}`);
    } else {
      console.log(`🔒 Admin security check passed: Exactly ${adminCount} administrator active.`);
    }

    // 3. Start Express HTTP Server
    const server = app.listen(config.port, () => {
      console.log('====================================================');
      console.log(`🚀 Secure Event Server listening on port: ${config.port}`);
      console.log(`🌍 Environment:    ${config.env}`);
      console.log(`🌐 Public API:     http://localhost:${config.port}/api`);
      console.log(`💻 Allowed Client: ${config.clientUrl}`);
      console.log('====================================================');
    });

    // Graceful Shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}. Commencing graceful shutdown...`);
      server.close(async () => {
        console.log('🔒 Closed out remaining active connections.');
        await disconnectDB();
        process.exit(0);
      });

      // Force shutdown if taking too long
      setTimeout(() => {
        console.error('⚠️ Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (err) {
    console.error('Fatal Server Boot Error:', err);
    process.exit(1);
  }
};

startServer();
