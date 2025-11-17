// app.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
require('dotenv').config();

// Swagger / Redoc
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const redoc = require('redoc-express');

const app = express();

// =========================
// Security Middleware
// =========================
app.use(helmet());
app.use(mongoSanitize());
app.use(xss());

// =========================
// Rate Limiting
// =========================
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// =========================
// CORS Configuration
// =========================
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // In development, allow all origins for easier testing
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // In production, check against allowed origins
    const allowedOrigins = process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',')
      : ['http://localhost:5000'];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// =========================
// Body Parsing & Compression
// =========================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

// =========================
// Logging
// =========================
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// =========================
// Database Connection
// =========================
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/elderconnect')
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// =========================
// Routes
// =========================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/otp', require('./routes/otp'));
app.use('/api/users', require('./routes/users'));
app.use('/api/family', require('./routes/family'));
app.use('/api/drivers', require('./routes/drivers'));
app.use('/api/schedules', require('./routes/schedules'));
app.use('/api/rides', require('./routes/rides'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/emergency', require('./routes/emergency'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/location', require('./routes/location'));
// app.use('/api/settings', require('./routes/settings'));

// =========================
// Swagger / Redoc Setup
// =========================
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "ElderConnect API",
      version: "1.0.0",
      description: "Interactive API documentation for ElderConnect backend",
    },
    servers: [
      { url: `http://localhost:${process.env.PORT || 5000}` },
    ],
  },
  apis: ["./routes/*.js"], // Path to route files
};

const swaggerSpecs = swaggerJsDoc(swaggerOptions);

// Swagger UI for interactive testing (embed spec to avoid any external fetch)
app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// Redoc for modern documentation view
app.get('/docs', (req, res, next) => {
  try {
    return redoc({
      title: 'ElderConnect API Docs',
      specUrl: '/swagger.json',
    })(req, res, next);
  } catch (error) {
    console.error('Redoc error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Error loading API documentation'
    });
  }
});

// Raw OpenAPI JSON
app.get('/swagger.json', (req, res) => res.json(swaggerSpecs));

// =========================
// Health Check
// =========================
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'ElderConnect API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// =========================
// 404 Handler
// =========================
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

// =========================
// Global Error Handler
// =========================
app.use((err, req, res, next) => {
  // Safely handle errors
  const status = err?.status || err?.statusCode || 500;
  const message = err?.message || 'Something went wrong!';
  const stack = err?.stack;

  console.error('Error:', {
    message,
    status,
    stack: process.env.NODE_ENV === 'development' ? stack : undefined,
    url: req?.url,
    method: req?.method
  });

  res.status(status).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong!' : message,
    ...(process.env.NODE_ENV === 'development' && stack && { stack })
  });
});

// =========================
// Start Server
// =========================
const PORT = process.env.PORT || 5000;
// Listen on all network interfaces (0.0.0.0) to allow access from other devices
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`🚀 ElderConnect API server running on ${HOST}:${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Accessible at: http://localhost:${PORT} or http://172.185.139.58:${PORT}`);
  console.log(`📋 API Base URL: http://172.185.139.58:${PORT}/api`);
});

module.exports = app;
