const mongoose = require('mongoose');
const config = require('./config');

let memoryServer = null;

const connectDB = async () => {
  // Reuse existing connection if already connected (vital for serverless lambdas)
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  try {
    let uri = config.mongoUri;

    if (uri === 'memory') {
      console.log('🔄 Spin up in-memory MongoDB server for development/testing...');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      memoryServer = await MongoMemoryServer.create();
      uri = memoryServer.getUri();
      console.log(`✅ In-memory MongoDB started at: ${uri}`);
    }

    const conn = await mongoose.connect(uri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 10000,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host} / DB: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    // Do not call process.exit(1) on serverless environments like Vercel / Lambda
    if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
      process.exit(1);
    }
    throw error;
  }
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
