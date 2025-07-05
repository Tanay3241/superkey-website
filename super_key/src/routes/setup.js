const express = require('express');
const router = express.Router();
const { db, admin } = require('../config/firebase');

router.post('/super-admin', async (req, res) => {
  try {
    const { fullName, email, phone, password, setupKey } = req.body;

    if (!fullName || !email || !phone || !password || !setupKey) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (setupKey !== process.env.SUPER_ADMIN_SETUP_KEY) {
      return res.status(403).json({ error: 'Invalid setup key' });
    }

    // Check if any super admin already exists (optional safeguard)
    const snap = await db.collection('users')
      .where('role', '==', 'super_admin')
      .limit(1)
      .get();

    if (!snap.empty) {
      return res.status(403).json({ error: 'Super admin already exists' });
    }

    // Create Firebase Auth user
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: fullName,
      phoneNumber: phone
    });

    // Store in Firestore
    await db.collection('users').doc(userRecord.uid).set({
      fullName,
      email,
      phone,
      role: 'super_admin',
      createdAt: admin.firestore.Timestamp.now()
    });

    res.json({ success: true, message: 'Super Admin created successfully', uid: userRecord.uid });
  } catch (err) {
    console.error('Super admin setup error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router };