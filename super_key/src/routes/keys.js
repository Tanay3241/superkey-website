const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { requireRole, authenticateUser } = require('../middleware/authMiddleware');
const keysController = require('../controllers/keysController');

// 0. Get all available keys - Modified to handle different roles
router.get('/', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    const userSnapshot = await db.collection('users').doc(userId).get();
    const userRole = userSnapshot.data()?.role;

    let keysSnapshot;
    
    // Different queries based on user role
    switch(userRole) {
      case 'super_admin':
        // Super admin can see all keys
        keysSnapshot = await db.collection('keys').get();
        break;
      case 'admin':
        // Admin can see their keys and their distributors' keys
        keysSnapshot = await db.collection('keys')
          .where('ownerId', '==', userId)
          .get();
        break;
      case 'distributor':
      case 'retailer':
      default:
        // Other roles can only see their own keys
        keysSnapshot = await db.collection('keys')
          .where('ownerId', '==', userId)
          .get();
        break;
    }

    const keys = [];
    keysSnapshot.forEach(doc => {
      keys.push({
        id: doc.id,
        keyId: doc.data().keyId,
        status: doc.data().status,
        isUsed: doc.data().isUsed || false,
        createdAt: doc.data().createdAt,
        ownerId: doc.data().ownerId
      });
    });

    console.log(`Fetched ${keys.length} keys for user ${userId} with role ${userRole}`);
    res.json({ keys });
  } catch (error) {
    console.error('Error fetching keys:', error);
    res.status(500).json({ error: 'Failed to fetch keys' });
  }
});

// 1. Generate Keys (Super Admin only)
router.post('/generate', authenticateUser, requireRole(['super_admin']), async (req, res) => {
  try {
    const { count = 1 } = req.body;
    const userId = req.user.uid;
    const keys = [];

    for (let i = 0; i < count; i++) {
      const keyDoc = await db.collection('keys').add({
        keyId: Math.random().toString(36).substr(2, 9).toUpperCase(),
        status: 'active',
        isUsed: false,
        createdAt: new Date().toISOString(),
        ownerId: userId,
        createdBy: userId
      });

      keys.push({
        id: keyDoc.id,
        keyId: keyDoc.data().keyId
      });
    }

    console.log(`Generated ${count} keys for super admin ${userId}`);
    res.json({ keys });
  } catch (error) {
    console.error('Error generating keys:', error);
    res.status(500).json({ error: 'Failed to generate keys' });
  }
});

// 2. Transfer Keys - Modified to handle hierarchy
router.post('/transfer', authenticateUser, async (req, res) => {
  try {
    const { recipientId, count } = req.body;
    const senderId = req.user.uid;

    // Get sender's role
    const senderDoc = await db.collection('users').doc(senderId).get();
    const senderRole = senderDoc.data()?.role;

    // Get recipient's role
    const recipientDoc = await db.collection('users').doc(recipientId).get();
    const recipientRole = recipientDoc.data()?.role;

    // Verify transfer hierarchy
    const validTransfer = await verifyTransferHierarchy(senderRole, recipientRole);
    if (!validTransfer) {
      return res.status(403).json({ error: 'Invalid transfer hierarchy' });
    }

    // Get available keys
    const availableKeys = await db.collection('keys')
      .where('ownerId', '==', senderId)
      .where('status', '==', 'active')
      .where('isUsed', '==', false)
      .limit(count)
      .get();

    if (availableKeys.size < count) {
      return res.status(400).json({ error: 'Not enough keys available' });
    }

    // Transfer keys
    const batch = db.batch();
    availableKeys.forEach(doc => {
      batch.update(doc.ref, { 
        ownerId: recipientId,
        lastTransferredAt: new Date().toISOString(),
        lastTransferredBy: senderId
      });
    });

    await batch.commit();
    console.log(`Transferred ${count} keys from ${senderId} to ${recipientId}`);
    res.json({ success: true, count });
  } catch (error) {
    console.error('Error transferring keys:', error);
    res.status(500).json({ error: 'Failed to transfer keys' });
  }
});

// Helper function to verify transfer hierarchy
async function verifyTransferHierarchy(senderRole, recipientRole) {
  const hierarchy = {
    'super_admin': ['admin', 'distributor', 'retailer'],
    'admin': ['distributor', 'retailer'],
    'distributor': ['retailer'],
    'retailer': []
  };

  return hierarchy[senderRole]?.includes(recipientRole) || false;
}

// 3. Revoke Keys (Super Admin only)
router.post('/revoke', authenticateUser, requireRole(['super_admin']), async (req, res) => {
  try {
    const { keyId } = req.body;
    const keyDoc = await db.collection('keys').where('keyId', '==', keyId).get();

    if (keyDoc.empty) {
      return res.status(404).json({ error: 'Key not found' });
    }

    await keyDoc.docs[0].ref.update({
      status: 'revoked',
      revokedAt: new Date().toISOString(),
      revokedBy: req.user.uid
    });

    console.log(`Key ${keyId} revoked by super admin ${req.user.uid}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error revoking key:', error);
    res.status(500).json({ error: 'Failed to revoke key' });
  }
});

// 4. Get recipients for transfer
router.get('/recipients', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    const userDoc = await db.collection('users').doc(userId).get();
    const userRole = userDoc.data()?.role;

    let recipientRoles;
    switch(userRole) {
      case 'super_admin':
        recipientRoles = ['admin', 'distributor', 'retailer'];
        break;
      case 'admin':
        recipientRoles = ['distributor', 'retailer'];
        break;
      case 'distributor':
        recipientRoles = ['retailer'];
        break;
      default:
        recipientRoles = [];
    }

    if (recipientRoles.length === 0) {
      return res.json({ recipients: [] });
    }

    const recipientsSnapshot = await db.collection('users')
      .where('role', 'in', recipientRoles)
      .get();

    const recipients = [];
    recipientsSnapshot.forEach(doc => {
      recipients.push({
        id: doc.id,
        email: doc.data().email,
        role: doc.data().role,
        name: doc.data().name || doc.data().email
      });
    });

    console.log(`Found ${recipients.length} recipients for user ${userId} with role ${userRole}`);
    res.json({ recipients });
  } catch (error) {
    console.error('Error fetching recipients:', error);
    res.status(500).json({ error: 'Failed to fetch recipients' });
  }
});

// Get key transactions history
router.get('/transactions', authenticateUser, keysController.getKeyTransactions);

// 5. Get keys for a specific user (Super Admin only)
router.get('/user/:userId', authenticateUser, requireRole(['super_admin']), keysController.getKeysCountForUser);

module.exports = router;

