const mongoose = require('mongoose');
const dns = require('dns');

// Fix for Node.js SRV resolution on cloud/Linux hosting providers
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (err) {
  // Ignore if custom dns setServers is restricted
}

let isConnected = false;
let lastError = null;
let connectionAttemptedUri = null;

// Fallback to Atlas Cluster if server environment variables were not passed by the host
const ATLAS_FALLBACK = 'mongodb+srv://zahidibnrizwan_db_user:3f5C80qDCJBZVv6i@cluster0.wsweyz2.mongodb.net/mltify?retryWrites=true&w=majority';

const normalizeMongoUri = (uri) => {
  const target = uri || ATLAS_FALLBACK;
  let cleanUri = target.trim();
  // If Atlas URI ends with .mongodb.net without database name
  if (cleanUri.includes('.mongodb.net') && !cleanUri.includes('.mongodb.net/')) {
    cleanUri = cleanUri.replace('.mongodb.net', '.mongodb.net/mltify?retryWrites=true&w=majority');
  } else if (cleanUri.endsWith('.mongodb.net/')) {
    cleanUri = `${cleanUri}mltify?retryWrites=true&w=majority`;
  }
  return cleanUri;
};

const connectDB = async () => {
  const rawUri = process.env.MONGODB_URI;
  const uri = normalizeMongoUri(rawUri);
  connectionAttemptedUri = uri.replace(/:([^@]+)@/, ':****@');

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
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
