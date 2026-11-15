const mongoose = require('mongoose');
const config = require('./config');

let memoryServer = null;

let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  // If memory DB requested for tests
  if (config.mongoUri === 'memory') {
    if (!memoryServer) {
      console.log('🔄 Spin up in-memory MongoDB server for development/testing...');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      memoryServer = await MongoMemoryServer.create();
      config.mongoUri = memoryServer.getUri();
      console.log(`✅ In-memory MongoDB started at: ${config.mongoUri}`);
    }
  }

  // Reuse existing connection if active
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (mongoose.connection.readyState === 1) {
    cached.conn = mongoose.connection;
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      autoIndex: true,
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
      socketTimeoutMS: 45000,
    };

    cached.promise = mongoose.connect(config.mongoUri, opts).then((mongooseInstance) => {
      console.log(`✅ MongoDB Connected: ${mongooseInstance.connection.host} / DB: ${mongooseInstance.connection.name}`);
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    cached.conn = null;
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
      process.exit(1);
    }
    throw error;
  }

  return cached.conn;
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (memoryServer) {
      await memoryServer.stop();
      console.log('🛑 In-memory MongoDB stopped.');
    }
  } catch (error) {
    console.error(`❌ Error during DB disconnect: ${error.message}`);
  }
};

module.exports = { connectDB, disconnectDB };
