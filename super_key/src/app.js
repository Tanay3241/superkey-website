require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session'); // Add this
const cookieParser = require('cookie-parser'); // Add this
const { db, admin } = require('./config/firebase');
const { authenticateUser } = require('./middleware/authMiddleware');

const app = express();

// Detailed CORS configuration
const corsOptions = {
  origin: ['http://localhost:3001', 'http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser()); // Add this

// Add session management
app.use(session({
  secret: process.env.SESSION_SECRET || 'superkey-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Add detailed request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}]`);
  console.log(`Method: ${req.method}`);
  console.log(`URL: ${req.url}`);
  console.log(`Headers:`, req.headers);
  next();
});

// CORS preflight handling
app.options('*', cors(corsOptions));

// Test route with error handling
app.get('/api/test', async (req, res) => {
  try {
    await db.collection('users').limit(1).get();
    res.json({ 
      status: 'ok',
      message: 'Server and Firebase connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test route error:', error);
    res.status(500).json({ 
      error: 'Server test failed',
      details: error.message 
    });
  }
});

// API Routes with error wrapping
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const keysRouter = require('./routes/keys');

app.use('/api/auth', (req, res, next) => {
  console.log('Auth request received:', req.path);
  return authRouter(req, res, next);
});

// Apply authentication middleware to users and keys routes
app.use('/api/users', authenticateUser, usersRouter);
app.use('/api/keys', authenticateUser, keysRouter);

// Enhanced error handling
app.use((err, req, res, next) => {
  console.error('Server error:', {
    message: err.message,
    stack: err.stack,
    path: req.path
  });
  
  res.status(err.status || 500).json({ 
    error: err.message || 'Internal server error',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;

// Start server with connection validation
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(50));
  console.log(`Server running on port ${PORT}`);
  console.log(`Frontend URL: http://localhost:3001`);
  console.log(`API URL: http://localhost:${PORT}/api`);
  console.log('='.repeat(50));
}).on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  } else {
    console.error('Server failed to start:', error);
  }
  process.exit(1);
});

// Handle process termination
process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Server shutdown complete');
    process.exit(0);
  });
});

module.exports = app;
