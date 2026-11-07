const mongoose = require('mongoose');
const dns = require('dns');

// Fix for Node.js SRV resolution on cloud/Linux hosting providers
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (err) {
  // Ignore if custom dns setServers is restricted
}

let isConnected = false;

const normalizeMongoUri = (uri) => {
  if (!uri) return 'mongodb://127.0.0.1:27017/mltify';
  let cleanUri = uri.trim();
  // If Atlas URI ends with .mongodb.net without database name
  if (cleanUri.includes('.mongodb.net') && !cleanUri.includes('.mongodb.net/')) {
    cleanUri = cleanUri.replace('.mongodb.net', '.mongodb.net/mltify?retryWrites=true&w=majority');
  } else if (cleanUri.endsWith('.mongodb.net/')) {
    cleanUri = `${cleanUri}mltify?retryWrites=true&w=majority`;
  }
  return cleanUri;
};

const connectDB = async () => {
  const uri = normalizeMongoUri(process.env.MONGODB_URI);

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });

    isConnected = true;
    console.log(`[MLTify] ✅ MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    isConnected = false;
    console.error(`\n❌ [MLTify Error] Failed to connect to MongoDB!`);
    console.error(`Reason: ${error.message}`);
    console.error(`Target URI: ${uri.replace(/:([^@]+)@/, ':****@')}`);
    console.error(`\n👉 Common production fixes:`);
    console.error(`1. Check MongoDB Atlas "Network Access" -> Allow 0.0.0.0/0 (Access from Anywhere)`);
    console.error(`2. Ensure MONGODB_URI environment variable is configured in your production hosting panel\n`);
    return false;
  }
};

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.warn('[MLTify Warning] MongoDB connection lost. Reconnecting...');
});

mongoose.connection.on('reconnected', () => {
  isConnected = true;
  console.log('[MLTify] ✅ MongoDB reconnected.');
});

module.exports = connectDB;
