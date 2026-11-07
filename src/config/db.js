const mongoose = require('mongoose');

let isConnected = false;
let lastError = null;
let connectionAttemptedUri = null;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    isConnected = false;
    lastError = 'MONGODB_URI environment variable is not defined in .env';
    console.error(`\n❌ [MLTify Error] ${lastError}`);
    return false;
  }

  connectionAttemptedUri = uri.replace(/:([^@]+)@/, ':****@');

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 10000,
    });

    isConnected = true;
    lastError = null;
    console.log(`[MLTify] ✅ MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    isConnected = false;
    lastError = error.message;
    console.error(`\n❌ [MLTify Error] Failed to connect to MongoDB!`);
    console.error(`Reason: ${error.message}`);
    console.error(`Target URI: ${connectionAttemptedUri}`);
    return false;
  }
};

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.warn('[MLTify Warning] MongoDB connection lost. Reconnecting...');
});

mongoose.connection.on('reconnected', () => {
  isConnected = true;
  lastError = null;
  console.log('[MLTify] ✅ MongoDB reconnected.');
});

const getConnectionDetails = () => ({
  isConnected,
  lastError,
  hasEnvUri: Boolean(process.env.MONGODB_URI),
  attemptedUri: connectionAttemptedUri,
});

module.exports = { connectDB, getConnectionDetails };
