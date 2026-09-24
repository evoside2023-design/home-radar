const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const env = require('./config/env');

const authRoutes = require('./routes/auth');
const scraperRoutes = require('./routes/scraper');
const propertyRoutes = require('./routes/properties');

const app = express();

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors({
  origin: env.frontendUrl,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Statyczne pliki demo (tylko katalog public/, nigdy src/)
app.use('/demo', express.static(path.join(__dirname, 'public')));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minut
  max: 100, // max 100 requestów na IP w oknie
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Landing page (no-JS)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api', (req, res) => {
  res.json({
    message: 'DomRadar API v1.0',
    endpoints: {
      auth: '/api/auth (register, login, me)',
      scraper: '/api/scraper (wymaga autoryzacji)',
      propertiesSearchStream: '/api/properties/search-stream?city=... (SSE)',
      properties: '/api/properties',
      propertySubmit: 'POST /api/properties/submit'
    }
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/scraper', scraperRoutes);
app.use('/api/properties', propertyRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      ...(!env.isProduction && { stack: err.stack })
    }
  });
});

module.exports = app;
