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
  origin: process.env.CORS_ORIGIN || 'http://localhost:5000',
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
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/elderconnect', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
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
app.get('/docs', redoc({
  title: 'ElderConnect API Docs',
  specUrl: '/swagger.json'
}));

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
  console.error(err.stack);
  res.status(err.status || 500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong!' : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// =========================
// Start Server
// =========================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 ElderConnect API server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
