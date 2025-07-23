const { db, admin } = require('../config/firebase');
const { logKeyTransaction, generateUnlockCodes } = require('../utils');

async function createKeys(req, res) {
  try {
    const { count = 1, validityInMonths } = req.body;
    if (!Number.isInteger(count) || count <= 0 || count > 100) {
      return res.status(400).json({ error: 'Invalid count' });
    }
    if (validityInMonths < 0) {
      return res.status(400).json({ error: 'Invalid validity' });
    }

    // Use Firestore server timestamp for now
    const now = admin.firestore.FieldValue.serverTimestamp();
    let validUntil = null;
    if (validityInMonths) {
      // Convert server timestamp to JS Date, add months, then convert back to Timestamp
      const nowDate = new Date();
      nowDate.setMonth(nowDate.getMonth() + validityInMonths);
      validUntil = admin.firestore.Timestamp.fromDate(nowDate);
    }

    const batch = db.batch();
    const createdKeyIds = [];
    const unlockCodes = generateUnlockCodes(12);

    // Build hierarchy object with null checks
    const hierarchy = {
      superAdmin: req.user.role === 'super_admin' ? req.user.uid : (req.user.hierarchy?.superAdmin || null),
      superDistributor: req.user.role === 'super_distributor' ? req.user.uid : (req.user.hierarchy?.superDistributor || null),
      distributor: req.user.role === 'distributor' ? req.user.uid : (req.user.hierarchy?.distributor || null)
    };

    for (let i = 0; i < count; i++) {
      const keyRef = db.collection('keys').doc();
      batch.set(keyRef, {
        createdBy: req.user.uid,
        assignedTo: req.user.uid,
        assignedRole: req.user.role,
        superDistributor: null,
        distributor: null,
        retailer: null,
        keyCode: null,
        provisionedAt: null,
        unlockCodes: unlockCodes,
        status: 'unassigned',
        revokedAt: null,
        createdAt: now,
        validUntil,
        hierarchy
      });
      createdKeyIds.push(keyRef.id);
    }

    // Update user's wallet
    const userRef = db.collection('users').doc(req.user.uid);
    batch.set(userRef, {
      wallet: {
        availableKeys: admin.firestore.FieldValue.increment(count),
        totalKeysReceived: admin.firestore.FieldValue.increment(count)
      }
    }, { merge: true });

    await batch.commit();

    // Log key creation transaction
    await logKeyTransaction({
      keyIds: createdKeyIds,
      action: 'created',
      fromUser: req.user.uid,
      toUser: req.user.uid,
      fromRole: req.user.role,
      toRole: req.user.role,
      participants: [req.user.uid],
      performedBy: req.user.uid,
      reason: `Created ${count} new key(s)`
    });

    res.json({
      success: true,
      message: `Created ${count} new keys`,
      keyIds: createdKeyIds
    });
  } catch (error) {
    console.error('Error creating keys:', error);
    res.status(500).json({ error: error.message });
  }
}

async function transferKeys(req, res) {
  try {
    const { toUserId, count } = req.body;
    if (!toUserId || !count || count <= 0) {
      return res.status(400).json({ error: 'Invalid request parameters' });
    }

    // Get recipient user details
    const toUserDoc = await db.collection('users').doc(toUserId).get();
    if (!toUserDoc.exists) {
      return res.status(404).json({ error: 'Recipient user not found' });
    }
    const toUser = toUserDoc.data();

    // Validate hierarchy
    const fromRole = req.user.role;
    const toRole = toUser.role;
    const validTransfers = {
      super_admin: ['super_distributor'],
      super_distributor: ['distributor'],
      distributor: ['retailer']
    };

    if (!validTransfers[fromRole]?.includes(toRole)) {
      return res.status(403).json({ error: 'Invalid transfer hierarchy' });
    }

    // Get available keys for the sender
    const keysSnap = await db.collection('keys')
      .where('assignedTo', '==', req.user.uid)
      .where('status', '==', 'credited')
      .limit(count)
      .get();

    if (keysSnap.empty || keysSnap.size < count) {
      return res.status(400).json({ error: 'Not enough available keys for transfer' });
    }

    const batch = db.batch();
    const now = admin.firestore.FieldValue.serverTimestamp();
    const keyIds = [];

    // Update each key
    keysSnap.forEach(doc => {
      const keyRef = doc.ref;
      const keyData = doc.data();
      keyIds.push(doc.id);

      const updatedHierarchy = {
        ...keyData.hierarchy,
        superDistributor: toRole === 'super_distributor' ? toUserId : keyData.hierarchy.superDistributor,
        distributor: toRole === 'distributor' ? toUserId : keyData.hierarchy.distributor,
        retailer: toRole === 'retailer' ? toUserId : keyData.hierarchy.retailer
      };

      batch.update(keyRef, {
        assignedTo: toUserId,
        assignedRole: toRole,
        transferredAt: now,
        hierarchy: updatedHierarchy,
        [`${toRole.replace('_', '')}`]: toUserId,
        status: 'credited'
      });
    });

    // Update sender's wallet
    const fromUserRef = db.collection('users').doc(req.user.uid);
    batch.set(fromUserRef, {
      wallet: {
        availableKeys: admin.firestore.FieldValue.increment(-count),
        totalKeysTransferred: admin.firestore.FieldValue.increment(count)
      }
    }, { merge: true });

    // Update recipient's wallet
    const toUserRef = db.collection('users').doc(toUserId);
    batch.set(toUserRef, {
      wallet: {
        availableKeys: admin.firestore.FieldValue.increment(count),
        totalKeysReceived: admin.firestore.FieldValue.increment(count)
      }
    }, { merge: true });

    await batch.commit();

    // Log transfer transaction
    await logKeyTransaction({
      keyIds,
      action: 'transferred',
      fromUser: req.user.uid,
      toUser: toUserId,
      fromRole,
      toRole,
      participants: [req.user.uid, toUserId],
      performedBy: req.user.uid,
      reason: `Transferred ${count} key(s) to ${toUser.name}`
    });

    res.json({
      success: true,
      message: `Successfully transferred ${count} keys to ${toUser.name}`
    });
  } catch (error) {
    console.error('Error transferring keys:', error);
    res.status(500).json({ error: error.message });
  }
}

async function revokeKeys (req, res) {
  try {
    const { userId, count, reason = '' } = req.body;

    if (!userId || !Number.isInteger(count) || count <= 0) {
      return res.status(400).json({ error: 'Invalid userId or count' });
    }

    // Get keys assigned to this user
    const keysSnap = await db.collection('keys')
      .where('assignedTo', '==', userId)
      .where('status', '==', 'credited')
      .limit(count)
      .get();

    if (keysSnap.empty) {
      return res.status(404).json({ error: 'No eligible keys found for revocation' });
    }

    const now = admin.firestore.Timestamp.now();
    const batch = db.batch();
    const keyIds = [];

    keysSnap.forEach(doc => {
      const ref = doc.ref;
      batch.update(ref, {
        assignedTo: null,
        assignedRole: null,
        status: 'revoked',
        revokedAt: now
      });
      keyIds.push(ref.id);
    });

    // Wallet adjustment
    const userRef = db.collection('users').doc(userId);
    batch.update(userRef, {
      'wallet.availableKeys': admin.firestore.FieldValue.increment(-keyIds.length),
      'wallet.totalRevoked': admin.firestore.FieldValue.increment(keyIds.length)
    });

    await batch.commit();

    // Get the user's role before logging the transaction
    const userDoc = await db.collection('users').doc(userId).get();
    const userRole = userDoc.exists ? userDoc.data().role : 'unknown';

    // Log the revocation
    await logKeyTransaction({
      keyIds,
      fromUser: userId,
      toUser: userId,
      action: 'revoked',
      performedBy: req.user.uid,
      fromRole: userRole,
      toRole: userRole,
      participants: Array.from(new Set([userId, req.user.uid])), // include both affected and acting user
      reason: reason || `Revoked by Super Admin`
    });

    res.json({ success: true, message: `Revoked ${keyIds.length} key(s)`, keyIds });
  } catch (error) {
    console.error('Revocation error:', error);
    if (error.code === 8 && error.details && error.details.includes('Quota exceeded')) {
      return res.status(503).json({ error: 'Firestore quota exceeded. Please try again later or upgrade your plan.' });
    }
    res.status(500).json({ error: error.message });
  }
}

async function getKeyTransactions (req, res) {
  const uid = req.user.uid;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const cursor = req.query.cursor;

  try {
    // First, get the user's document to check their role
    const userDoc = await db.collection('users').doc(uid).get();
    const user = userDoc.data();
    const isSuperAdmin = user?.role === 'super_admin';

    // Create base query with sorting
    let query = db.collection('keyTransactions')
      .orderBy('timestamp', 'desc');

    // Only filter by participants if not super admin
    if (!isSuperAdmin) {
      query = query.where('participants', 'array-contains', uid);
    }

    // Apply cursor and limit
    if (cursor) {
      const cursorTimestamp = admin.firestore.Timestamp.fromMillis(parseInt(cursor));
      const cursorDoc = await db.collection('keyTransactions')
        .where('timestamp', '==', cursorTimestamp)
        .limit(1)
        .get();
      
      if (!cursorDoc.empty) {
        query = query.startAfter(cursorDoc.docs[0]);
      }
    }
    query = query.limit(pageSize);

    const snap = await query.get();

    const transactions = snap.docs.map(doc => {
      const data = doc.data();
      // Include all relevant fields but exclude sensitive data
      const { keyIds, participants, performedBy, ...dataWithoutSensitive } = data;
      return { 
        id: doc.id,
        ...dataWithoutSensitive,
        // Convert timestamp to milliseconds for frontend
        timestamp: data.timestamp.toMillis()
      };
    });
    
    const hasMore = snap.size === pageSize;
    let nextCursor = null;
    if (hasMore && snap.docs.length > 0) {
      const lastDoc = snap.docs[snap.docs.length - 1];
      nextCursor = lastDoc.data().timestamp.toMillis().toString();
    }

    res.json({ transactions, nextCursor, hasMore });
  } catch (err) {
    console.error('Error fetching paginated key transactions:', err);
    res.status(500).json({ error: 'Failed to retrieve transactions' });
  }
}

async function getAvailableKeys(req, res) {
  try {
    // Fetch all keys from Firestore
    const keysSnapshot = await db.collection('keys').get();
    const keys = keysSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(keys);
  } catch (error) {
    console.error('Error fetching available keys:', error);
    if (error.code === 8 && error.details && error.details.includes('Quota exceeded')) {
      return res.status(503).json({ error: 'Firestore quota exceeded. Please try again later or upgrade your plan.' });
    }
    res.status(500).json({ error: 'Failed to fetch available keys' });
  }
}

async function getKeysCount(req, res) {
  try {
    const userId = req.user.uid;
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });
    const user = userDoc.data();
    let query = db.collection('keys').where('assignedTo', '==', userId);
    // Optionally, filter by status if needed (e.g., only credited/active keys)
    // query = query.where('status', 'in', ['credited', 'unassigned']);
    const keysSnap = await query.get();
    return res.json({ count: keysSnap.size });
  } catch (error) {
    console.error('getKeysCount error:', error);
    return res.status(500).json({ error: 'Failed to fetch keys count' });
  }
}

async function getKeysCountForUser(req, res) {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    // Only allow super admin to use this endpoint
    if (!req.user || req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const keysSnap = await db.collection('keys').where('assignedTo', '==', userId).get();
    const keys = [];
    keysSnap.forEach(doc => keys.push({ id: doc.id, ...doc.data() }));
    return res.json({ keys });
  } catch (error) {
    console.error('getKeysCountForUser error:', error);
    return res.status(500).json({ error: 'Failed to fetch keys count for user' });
  }
}

module.exports = {
  createKeys,
  transferKeys,
  revokeKeys,
  getAvailableKeys,
  getKeysCount,
  getKeysCountForUser,
  getKeyTransactions
};