const { admin } = require('../config/firebase');

const authenticateUser = async (req, res, next) => {
  // Add CORS headers
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173'); // Or whatever your frontend's actual port is
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // If user is already authenticated via session, proceed
  if (req.session && req.session.user) {
    req.user = req.session.user;
    return next();
  }

  try {
    const authHeader = req.headers.authorization;
    console.log('Auth request from origin:', req.headers.origin);
    console.log('Auth header:', authHeader);

    if (!authHeader?.startsWith('Bearer ')) {
      console.log('No bearer token found');
      return res.status(401).json({ 
        error: 'No token provided',
        details: 'Authorization header must start with Bearer'
      });
    }

    const token = authHeader.split('Bearer ')[1];
    console.log('Attempting to verify token...');
    
    const decodedToken = await admin.auth().verifyIdToken(token);
    console.log('Token verified successfully for:', decodedToken.uid);

    // Get user data from Firestore with error handling
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(decodedToken.uid)
      .get()
      .catch(error => {
        console.error('Firestore fetch error:', error);
        throw new Error('Failed to fetch user data');
      });

    if (!userDoc.exists) {
      console.log('User document not found for:', decodedToken.uid);
      return res.status(404).json({ 
        error: 'User not found',
        details: 'No matching user document in Firestore'
      });
    }

    const userData = userDoc.data();
    if (!userData.role) {
      console.log('User role not found for:', decodedToken.uid);
      return res.status(400).json({ 
        error: 'Invalid user data',
        details: 'User role not specified'
      });
    }

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: userData.role,
      name: userData.name || userData.email
    };

    console.log('User successfully authenticated:', {
      uid: req.user.uid,
      role: req.user.role
    });
    
    next();
  } catch (error) {
    console.error('Authentication error details:', error);
    
    // Handle specific Firebase Auth errors
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ 
        error: 'Token expired',
        details: 'Please log in again'
      });
    }
    
    if (error.code === 'auth/invalid-token') {
      return res.status(401).json({ 
        error: 'Invalid token',
        details: 'Token validation failed'
      });
    }

    res.status(401).json({ 
      error: 'Authentication failed',
      details: error.message
    });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// Error handling middleware
const handleErrors = (err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.name === 'TypeError' && err.message.includes('path-to-regexp')) {
    return res.status(400).json({ error: 'Invalid route parameter' });
  }

  if (err.code === 'auth/id-token-expired') {
    return res.status(401).json({ error: 'Token expired' });
  }

  if (err.code === 'auth/invalid-token') {
    return res.status(401).json({ error: 'Invalid token' });
  }

  res.status(500).json({ error: 'Internal server error' });
};

module.exports = { authenticateUser, requireRole, handleErrors };