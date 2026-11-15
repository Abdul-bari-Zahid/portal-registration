const mongoose = require('mongoose');
const config = require('./config');

let memoryServer = null;

const connectDB = async () => {
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
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host} / DB: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
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
