const mongoose = require('mongoose');

let isConnected = false;
let lastError = null;
let connectionAttemptedUri = null;
let connectionPromise = null;

const connectDB = async () => {
  // If already connected, return immediately
  if (mongoose.connection.readyState === 1) {
    isConnected = true;
    lastError = null;
    return true;
  }

  // If already in the process of connecting, await the existing promise
  if (mongoose.connection.readyState === 2 && connectionPromise) {
    try {
      await connectionPromise;
      return mongoose.connection.readyState === 1;
    } catch (e) {
      // Will fall through to reconnect
    }
  }

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    isConnected = false;
    lastError = 'MONGODB_URI environment variable is not defined in environment';
    console.error(`\n❌ [MLTify Error] ${lastError}`);
    return false;
  }

  connectionAttemptedUri = uri.replace(/:([^@]+)@/, ':****@');

  try {
    connectionPromise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
    });

    const conn = await connectionPromise;
    isConnected = true;
    lastError = null;
    console.log(`[MLTify] ✅ MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    connectionPromise = null;
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
  connectionPromise = null;
  console.warn('[MLTify Warning] MongoDB connection lost.');
});

mongoose.connection.on('reconnected', () => {
  isConnected = true;
  lastError = null;
  console.log('[MLTify] ✅ MongoDB reconnected.');
});

const getConnectionDetails = () => ({
  isConnected: mongoose.connection.readyState === 1,
  readyState: mongoose.connection.readyState,
  lastError,
  hasEnvUri: Boolean(process.env.MONGODB_URI),
  attemptedUri: connectionAttemptedUri,
});

module.exports = { connectDB, getConnectionDetails };

