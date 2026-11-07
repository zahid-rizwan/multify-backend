const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

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

// Health check endpoint
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  res.json({
    status: dbState === 1 ? 'healthy' : 'degraded',
    database: {
      state: states[dbState] || 'unknown',
      connected: dbState === 1,
      host: mongoose.connection.host || null,
      name: mongoose.connection.name || null,
    },
    project: 'MLTify Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Middleware to prevent buffering timeouts when database is not connected
app.use('/api', (req, res, next) => {
  // Allow health endpoint regardless of DB status
  if (req.path === '/health') return next();

  if (mongoose.connection.readyState === 0) {
    return res.status(503).json({
      success: false,
      message: 'Database connection is offline.',
      error: 'Cannot reach MongoDB cluster. Please verify your MONGODB_URI and check that MongoDB Atlas Network Access allows 0.0.0.0/0 (Access from Anywhere).',
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
