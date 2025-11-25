require('dotenv').config({ path: '../../.env' });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { testConnection } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static test files
const path = require('path');
app.use('/test', express.static(path.join(__dirname)));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve landing page at root (no-JS for Simple Browser)
app.get('/', (req, res) => {
  const htmlPath = path.join(__dirname, 'index.html');
  res.sendFile(htmlPath);
});

// API Routes
// const authRoutes = require('./routes/auth');
// const scraperRoutes = require('./routes/scraper');
const propertyRoutes = require('./routes/properties');

app.get('/api', (req, res) => {
  res.json({ 
    message: 'DomRadar API v1.0 - Progressive Search',
    endpoints: {
      // auth: '/api/auth',
      // scraper: '/api/scraper',
      properties: '/api/properties/search-stream (SSE)',
      propertiesStandard: '/api/properties/search'
    }
  });
});

// Routes
// app.use('/api/auth', authRoutes);
// app.use('/api/scraper', scraperRoutes);
app.use('/api/properties', propertyRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, async () => {
  console.log('='.repeat(50));
  console.log(`🚀 DomRadar Backend running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 API: http://localhost:${PORT}/api`);
  console.log('='.repeat(50));
  
  // Test database connection (optional - nie zatrzyma serwera jeśli baza nie jest dostępna)
  await testConnection();
});

module.exports = app;
