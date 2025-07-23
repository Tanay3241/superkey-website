const express = require('express');
const router = express.Router();
const { admin, db } = require('../config/firebase');
const { authenticateUser } = require('../middleware/authMiddleware'); // Import the middleware

// LOGIN: Handle ID token verification for session login
router.post('/login', authenticateUser, async (req, res) => {
  try {
    // If authenticateUser middleware passes, user data is already attached to req.user
    const userRecord = req.user; // User data from authenticated token

    // Get user data from Firestore (if not already fetched by middleware)
    const userDoc = await db.collection('users').doc(userRecord.uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }

    const userData = userDoc.data();
    
    // Create a session for the user
    req.session.user = {
      uid: userRecord.uid,
      email: userRecord.email,
      role: userData.role || 'user',
      name: userData.name || userRecord.email
    };

    // Return user data
    res.json({
      success: true,
      user: req.session.user
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ 
      error: 'Authentication failed' 
    });
  }
});

// Check Session: Verify if the user is still authenticated
router.get('/checkSession', async (req, res) => {
  try {
    // Check if session exists
    if (!req.session.user) {
      return res.status(401).json({
        success: false,
        error: 'No active session'
      });
    }
    
    // Get latest user data from Firestore
    const userDoc = await db.collection('users').doc(req.session.user.uid).get();
    
    if (!userDoc.exists) {
      // Clear invalid session
      req.session.destroy();
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }

    const userData = userDoc.data();
    
    res.json({
      success: true,
      user: {
        uid: req.session.user.uid,
        email: req.session.user.email,
        role: userData.role || 'user',
        name: userData.name || req.session.user.email,
        wallet: userData.wallet || {
          availableKeys: 0,
          totalKeysReceived: 0,
          totalKeysTransferred: 0,
          totalProvisioned: 0,
          totalRevoked: 0
        }
      }
    });
  } catch (error) {
    console.error('Check session error:', error);
    res.status(401).json({ 
      error: 'Session verification failed' 
    });
  }
});

// Add a logout route to clear the session
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: 'Failed to logout'
      });
    }
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  });
});

module.exports = router;
