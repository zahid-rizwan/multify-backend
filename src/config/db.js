const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mltify', {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[MLTify] MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.error(`[MLTify Warning] MongoDB connection error: ${error.message}`);
    console.warn('[MLTify Warning] If you are running MongoDB Atlas, update MONGODB_URI in .env');
    return false;
  }
};

module.exports = connectDB;

