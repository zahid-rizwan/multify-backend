const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const net = require('net');
const { connectDB, getConnectionDetails } = require('./config/db');

// Load environment variables (support root, app dir, and cwd)
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();

console.log(`[MLTify] Initializing backend...`);
console.log(`[MLTify] MONGODB_URI detected: ${process.env.MONGODB_URI ? 'YES' : 'NO (Missing MONGODB_URI in .env)'}`);

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(
  cors({
    origin: '*', // Adjust to process.env.FRONTEND_URL in production
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploaded files (PDFs)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint with live database diagnosis
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  const details = getConnectionDetails();

  res.json({
    status: dbState === 1 ? 'healthy' : 'degraded',
    database: {
      state: states[dbState] || 'unknown',
      connected: dbState === 1,
      hasEnvUri: details.hasEnvUri,
      target: details.attemptedUri,
      error: details.lastError,
      host: mongoose.connection.host || null,
      name: mongoose.connection.name || null,
    },
    project: 'MLTify Backend API',
    version: '1.0.1',
    timestamp: new Date().toISOString(),
  });
});

// Port test endpoint to verify if the web host firewall allows outbound port 27017
app.get('/api/test-port', (req, res) => {
  const host = 'ac-hfknabi-shard-00-00.wsweyz2.mongodb.net';
  const port = 27017;
  const socket = new net.Socket();
  socket.setTimeout(5000);

  socket.on('connect', () => {
    socket.destroy();
    res.json({
      success: true,
      port27017Open: true,
      message: 'TCP Port 27017 is OPEN on your hosting server! Your hosting firewall is NOT blocking MongoDB Atlas.',
    });
  });

  socket.on('timeout', () => {
    socket.destroy();
    res.status(504).json({
      success: false,
      port27017Open: false,
      message: 'TIMEOUT: Your web hosting firewall (CSF/iptables) is BLOCKING outbound TCP port 27017! Contact your hosting support to unblock port 27017.',
    });
  });

  socket.on('error', (err) => {
    socket.destroy();
    res.status(502).json({
      success: false,
      port27017Open: false,
      error: err.message,
      message: 'CONNECTION REFUSED/BLOCKED: Your web hosting provider is blocking outbound connections on port 27017.',
    });
  });

  socket.connect(port, host);
});

// Diagnostic endpoint to inspect raw MongoDB connection error from driver
app.get('/api/test-db', async (req, res) => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return res.status(500).json({ error: 'MONGODB_URI is not set in process.env' });
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 10000,
    });
    res.json({
      success: true,
      message: 'MongoDB connected successfully from this request!',
      host: conn.connection.host,
      name: conn.connection.name,
      readyState: conn.connection.readyState,
    });
  } catch (err) {
    const serverDetails = [];
    if (err.reason && err.reason.servers) {
      err.reason.servers.forEach((desc, server) => {
        serverDetails.push({
          server,
          type: desc.type,
          error: desc.error ? desc.error.message : null,
          code: desc.error ? desc.error.code : null,
          wireVersion: desc.wireVersion,
        });
      });
    }

    res.status(500).json({
      success: false,
      errorName: err.name,
      errorMessage: err.message,
      topologyType: err.reason ? err.reason.type : null,
      serverDetails,
    });
  }
});

// Middleware to prevent buffering timeouts when database is not connected
app.use('/api', (req, res, next) => {
  // Allow diagnostic endpoints regardless of DB status
  if (req.path === '/health' || req.path === '/test-port' || req.path === '/test-db') return next();

  if (mongoose.connection.readyState === 0) {
    const details = getConnectionDetails();
    return res.status(503).json({
      success: false,
      message: 'Database connection is offline.',
      reason: details.lastError || 'Cannot connect to MongoDB cluster.',
      hasEnvConfigured: details.hasEnvUri,
      targetAttempted: details.attemptedUri,
    });
  }
  next();
});

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/subjects', require('./routes/subjectRoutes'));
app.use('/api/resources', require('./routes/resourceRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Root welcome
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to MLTify API - Simplifying Lab Learning for MLT Students',
    docs: {
      health: '/api/health',
      testPort: '/api/test-port',
      subjects: '/api/subjects',
      resources: '/api/resources',
      admin: '/api/admin/stats',
    },
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🔬 MLTify API Server running on port ${PORT}`);
  console.log(`🌐 Base URL: http://localhost:${PORT}`);
  console.log(`📚 Public API: http://localhost:${PORT}/api/resources`);
  console.log(`===============================================`);
});
