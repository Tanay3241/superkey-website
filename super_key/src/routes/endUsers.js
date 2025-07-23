const express = require('express');
const router = express.Router();
const { requireRole, authenticateUser } = require('../middleware/authMiddleware');
const { createEndUser } = require('../controllers/endUsersController');
const { db } = require('../config/firebase');

// Create end user
router.post('/create', authenticateUser, requireRole(['retailer']), createEndUser);

// Get end users for retailer
router.get('/', authenticateUser, requireRole(['retailer']), async (req, res) => {
  try {
    const { uid } = req.user;
    console.log('Fetching end users for retailer:', uid);

    const endUsersRef = db.collection('endUsers');
    const snapshot = await endUsersRef.where('retailerId', '==', uid).get();

    console.log(`Found ${snapshot.size} end users`);

    const users = snapshot.docs.map(doc => {
      const data = doc.data();
      // Convert Firestore timestamps to ISO strings
      if (data.createdAt && typeof data.createdAt.toDate === 'function') {
        data.createdAt = data.createdAt.toDate().toISOString();
      }
      // Include document ID and all data
      return { 
        id: doc.id,
        ...data,
        // Format phone number for display if needed
        phoneNumber: data.phoneNumber || data.phone,
        // Ensure these fields are always present
        status: data.status || 'active',
        lastActive: data.lastActive ? data.lastActive.toDate().toISOString() : null
      };
    });

    res.json({ users });
  } catch (error) {
    console.error('Error fetching end users:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;