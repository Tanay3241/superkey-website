const express = require('express');
const router = express.Router();
const { admin, db } = require('../config/firebase');

// Setup route to create initial admin user
router.post('/create-admin', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    // Check if user already exists in Firebase Auth
    try {
      const existingUser = await admin.auth().getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }
    } catch (error) {
      // User doesn't exist, continue with creation
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
    }

    // Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    // Set custom claims for admin role
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role: 'super_admin'
    });

    // Create user document in Firestore
    await db.collection('users').doc(userRecord.uid).set({
      email,
      name,
      role: 'super_admin',
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      wallet: {
        availableKeys: 0,
        totalKeysReceived: 0,
        totalKeysTransferred: 0,
        totalProvisioned: 0,
        totalRevoked: 0
      }
    });

    res.json({ 
      success: true, 
      message: 'Admin user created successfully',
      uid: userRecord.uid 
    });
  } catch (error) {
    console.error('Setup error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;