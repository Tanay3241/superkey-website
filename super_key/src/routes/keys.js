const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { requireRole, authenticateUser } = require('../middleware/authMiddleware');

const { createKeys, transferKeys, revokeKeys, provisionKey, getUserKeys } = require('../controllers/keysController');


// 1. Generate Keys (Super Admin only)
router.post('/generate', authenticateUser, requireRole(['super_admin']), createKeys);


// 2. Transfer Keys Down the Hierarchy
router.post('/transfer', authenticateUser, transferKeys);

// 3. Revoke Key (Super Admin only, not provisioned)
router.post('/revoke', authenticateUser, requireRole(['super_admin']), revokeKeys);

// 4. Provision Key to End User
router.post('/provision', authenticateUser, requireRole(['retailer']), provisionKey);

// 6. Get Keys Assigned to Current User
router.get('/my-keys', authenticateUser, async (req, res) => {
  try {
    const snapshot = await db.collection('keys')
      .where('assignedTo', '==', req.user.uid)
      .where('status', 'in', ['unassigned', 'credited'])
      .get();

    const keys = [];
    snapshot.forEach(doc => {
      keys.push({ id: doc.id, ...doc.data() });
    });

    res.json({ keys });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Get Keys Assigned to a Specific User (for super admin to view other users' keys)
router.get('/user/:userId', authenticateUser, requireRole(['super_admin']), getUserKeys);

module.exports = { router };
