const express = require('express');
const router = express.Router();
const { admin, db } = require('../config/firebase');
const { authenticateUser } = require('../middleware/authMiddleware');


// LOGIN: Handle email/password login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }

    try {
      // Sign in with email and password using Firebase Auth REST API
      const signInResponse = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_WEB_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
            returnSecureToken: true,
          }),
        }
      );

      const signInData = await signInResponse.json();
      console.log('Firebase Sign-in Data:', signInData);

      if (!signInData.idToken) {
        // Handle specific Firebase Auth errors
        const errorCode = signInData.error?.message;
        if (errorCode === 'EMAIL_NOT_FOUND') {
          return res.status(401).json({ error: 'No account found with this email address' });
        } else if (errorCode === 'INVALID_PASSWORD') {
          return res.status(401).json({ error: 'Invalid password. Please try again' });
        } else if (errorCode === 'USER_DISABLED') {
          return res.status(403).json({ error: 'This account has been disabled. Please contact support' });
        } else {
          throw new Error(errorCode || 'Authentication failed');
        }
      }

      // Get user from Firebase Auth
      const userRecord = await admin.auth().getUserByEmail(email);
      
      // Fetch user profile from Firestore
      const userDoc = await db.collection('users').doc(userRecord.uid).get();
      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User profile not found. Please contact support' });
      }

      // Check if user is active
      const userData = userDoc.data();
      if (userData.status === 'inactive') {
        return res.status(403).json({ error: 'Your account is inactive. Please contact support' });
      }

      // Create a custom token
      const customToken = await admin.auth().createCustomToken(userRecord.uid);
      
      res.json({ 
        success: true, 
        user: userData,
        token: customToken
       });
    } catch (error) {
      console.error('Firebase Auth Error:', error.message, error.code, error);
      // Provide more specific error messages based on the error
      if (error.code === 'auth/user-not-found') {
        res.status(401).json({ error: 'No account found with this email address' });
      } else if (error.code === 'auth/wrong-password') {
        res.status(401).json({ error: 'Invalid password. Please try again' });
      } else if (error.code === 'auth/too-many-requests') {
        res.status(429).json({ error: 'Too many failed login attempts. Please try again later or reset your password' });
      } else if (error.code === 'auth/user-disabled') {
        res.status(403).json({ error: 'This account has been disabled. Please contact support' });
      } else {
        res.status(401).json({ error: 'Invalid email or password' });
      }
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again later' });
  }
});

// 👇 Session login: exchanges ID token for a session cookie
router.post('/sessionLogin', async (req, res) => {
  const { idToken } = req.body;
  console.log('Auth: Received ID token for sessionLogin:', idToken ? 'Yes' : 'No');
  if (!idToken) {
    return res.status(400).json({ error: 'ID token is required' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    console.log('Auth: Decoded UID:', uid);
    console.log('Auth: UID before assignment to req.session.uid:', uid);

    // Store UID in express-session
    req.session.uid = uid;
    console.log('Auth: req.session.uid immediately after assignment:', req.session.uid);

    console.log('Auth: Session ID before save:', req.session.id);
    req.session.save((err) => {
      if (err) {
        console.error('Auth: Session save error:', err);
        return res.status(500).json({ error: 'Failed to save session' });
      }
      console.log('Auth: Session saved. Session ID after save:', req.session.id);
      console.log('Auth: User UID stored in session (after save):', req.session.uid);
      console.log('Auth: Session object (after save):', req.session);
      res.json({ success: true, message: 'Session established via express-session', session: req.session, sessionSaved: true});
    });
  } catch (err) {
    console.error('Auth: Error verifying ID token or setting session:', err);
    console.error('Auth: Full error object:', err);
    res.status(401).json({ error: 'Invalid ID token or session establishment failed' });
  }
});

// 👇 Logout route: clears session cookie
router.post('/logout', async (req, res) => {
  // Clear the express-session
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).json({ error: 'Failed to log out' });
    }
    // Clear the connect.sid cookie
    res.clearCookie('connect.sid'); 
    console.log('Session destroyed and connect.sid cookie cleared.');
    res.json({ success: true, message: 'Logged out' });
  });
});

// 👇 Session check: verifies session cookie and returns a new custom token
router.get('/checkSession', async (req, res) => {
  console.log('Auth: checkSession route hit.');
  console.log('Auth: req.session in checkSession:', req.session);
  console.log('Auth: req.sessionID in checkSession:', req.sessionID);
  if (req.session && req.session.uid) {
    try {
      const customToken = await admin.auth().createCustomToken(req.session.uid);
      return res.status(200).json({ success: true, customToken });
    } catch (error) {
      console.error('Error creating custom token:', error);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  } else {
    return res.status(401).json({ success: false, error: 'No active session' });
  }
});

module.exports = { router, authenticateUser };
