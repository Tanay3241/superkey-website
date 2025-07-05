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
    const now = admin.firestore.Timestamp.now();
    let validUntil = null;
    if (validityInMonths) {
      // Convert server timestamp to JS Date, add months, then convert back to Timestamp
      const nowDate = new Date(); // This will be close to server time, but for true server time, you may need to use a Cloud Function
      nowDate.setMonth(nowDate.getMonth() + validityInMonths);
      validUntil = admin.firestore.Timestamp.fromDate(nowDate);
    }

    const batch = db.batch();
    const createdKeyIds = [];
    const unlockCodes = generateUnlockCodes(12);

    for (let i = 0; i < count; i++) {
      const keyRef = db.collection('keys').doc();
      batch.set(keyRef, {
        createdBy: req.user.uid,
        assignedTo: req.user.uid,
        assignedRole: 'super_admin',
        superDistributor: null,
        distributor: null,
        retailer: null,
        keyCode: null,
        provisionedAt: null,
        unlockCodes: unlockCodes,
        status: 'unassigned',
        revokedAt: null,
        createdAt: now,
        validUntil
      });
      createdKeyIds.push(keyRef.id);
    }

    // Update Super Admin wallet
    const adminRef = db.collection('users').doc(req.user.uid);
    batch.set(adminRef, {
      wallet: {
        availableKeys: admin.firestore.FieldValue.increment(count),
        totalKeysReceived: admin.firestore.FieldValue.increment(count)
      }
    }, { merge: true });

    await batch.commit();

    // Log transaction
    await logKeyTransaction({
      keyIds: createdKeyIds,
      action: 'created',
      fromUser: null,
      toUser: req.user.uid,
      fromRole: null,
      toRole: 'super_admin',
      performedBy: req.user.uid,
      reason: `Created ${count} keys`
    });

    res.json({ success: true, message: `${count} key(s) created`, keyIds: createdKeyIds });
  } catch (error) {
    console.error('Key creation error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function transferKeys(req, res) {
  try {
    const { toUserId, count } = req.body;
    const fromUserId = req.user.uid;

    if (!toUserId || !Number.isInteger(count) || count <= 0) {
      return res.status(400).json({ error: 'Invalid toUserId or count' });
    }

    const fromUserDoc = await db.collection('users').doc(req.user.uid).get();
    if (!fromUserDoc.exists) return res.status(404).json({ error: 'Sender not found' });
    const fromUser = fromUserDoc.data();
    const fromRole = fromUser.role;

    // Fetch receiver
    const toUserSnap = await db.collection('users').doc(toUserId).get();
    if (!toUserSnap.exists) return res.status(404).json({ error: 'Recipient not found' });
    const toUser = toUserSnap.data();

    // Enforce transfer hierarchy
    const validTransfers = {
      super_admin: ['super_distributor'],
      super_distributor: ['distributor'],
      distributor: ['retailer']
    };

    if (!validTransfers[fromRole]?.includes(toUser.role)) {
      return res.status(403).json({ error: 'Unauthorized role transfer' });
    }

    // Determine eligible key status
    const allowedStatus = fromRole === 'super_admin' ? ['unassigned'] : ['credited'];

    // Fetch available keys
    const keysSnap = await db.collection('keys')
      .where('assignedTo', '==', fromUserId)
      .where('status', 'in', allowedStatus)
      .limit(count)
      .get();

    if (keysSnap.size < count) {
      return res.status(400).json({ error: `Only ${keysSnap.size} transferable key(s) found` });
    }

    const senderSnap = await db.collection('users').doc(fromUserId).get();
    const sender = senderSnap.data();
    console.log(sender);
    const now = admin.firestore.Timestamp.now();
    const batch = db.batch();
    const keyIds = [];

    keysSnap.forEach(doc => {
      const keyRef = doc.ref;
      const update = {
        assignedTo: toUserId,
        assignedRole: toUser.role,
        transferredFrom: fromUserId,
        transferredAt: now,
        status: 'credited'
      };

      // Set flat role trail
      if (fromRole === 'super_admin') update.superDistributor = toUserId;
      if (fromRole === 'super_distributor') update.distributor = toUserId;
      if (fromRole === 'distributor') update.retailer = toUserId;

      batch.update(keyRef, update);
      keyIds.push(keyRef.id);
    });

    // Update wallets
    const fromUserRef = db.collection('users').doc(fromUserId);
    const toUserRef = db.collection('users').doc(toUserId);

    batch.update(fromUserRef, {
      'wallet.availableKeys': admin.firestore.FieldValue.increment(-keyIds.length),
      'wallet.totalKeysTransferred': admin.firestore.FieldValue.increment(keyIds.length)
    });

    batch.set(toUserRef, {
      wallet: {
        availableKeys: admin.firestore.FieldValue.increment(keyIds.length),
        totalKeysReceived: admin.firestore.FieldValue.increment(keyIds.length)
      }
    }, { merge: true });

    await batch.commit();

    // Log transaction as single event
    await logKeyTransaction({
      keyIds,
      fromUser: fromUserId,
      toUser: toUserId,
      fromRole,
      toRole: toUser.role,
      performedBy: fromUserId,
      action: 'credited',
      reason: `Transferred ${keyIds.length} key(s)`
    });

    res.json({ success: true, message: `Transferred ${keyIds.length} keys`, keyIds });
  } catch (error) {
    console.error('Transfer error:', error);
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

    // Log the revocation
    await logKeyTransaction({
      keyIds,
      fromUser: userId,
      toUser: null,
      action: 'revoked',
      performedBy: req.user.uid,
      fromRole: 'super_admin',
      toRole: null,
      reason: reason || `Revoked by Super Admin`
    });

    res.json({ success: true, message: `Revoked ${keyIds.length} key(s)`, keyIds });
  } catch (error) {
    console.error('Revocation error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function provisionKey(req, res) {
  try {
    const { keyId, endUserId, deviceName, imei1, imei2 } = req.body;
    const provisionedBy = req.user.uid;

    if (!keyId || !endUserId || !deviceName || !imei1 || !imei2) {
      return res.status(400).json({ error: 'Missing required fields for provisioning' });
    }

    const keyRef = db.collection('keys').doc(keyId);
    const keyDoc = await keyRef.get();

    if (!keyDoc.exists) {
      return res.status(404).json({ error: 'Key not found' });
    }

    const keyData = keyDoc.data();

    if (keyData.assignedTo !== provisionedBy || !['unassigned', 'credited'].includes(keyData.status)) {
      return res.status(403).json({ error: 'Key is not available for provisioning by this user' });
    }

    const endUserRef = db.collection('endUsers').doc(endUserId);
    const endUserDoc = await endUserRef.get();

    if (!endUserDoc.exists) {
      return res.status(404).json({ error: 'End user not found' });
    }

    const batch = db.batch();
    const now = admin.firestore.Timestamp.now();

    batch.update(keyRef, {
      status: 'provisioned',
      provisionedAt: now,
      provisionedBy: provisionedBy,
      assignedTo: endUserId, // Assign to end user
      assignedRole: 'end_user',
      deviceName,
      imei1,
      imei2,
      // Clear previous assignment details if any
      transferredFrom: admin.firestore.FieldValue.delete(),
      distributor: admin.firestore.FieldValue.delete(),
      retailer: admin.firestore.FieldValue.delete(),
    });

    // Update the wallet of the user who provisioned the key
    const provisionerUserRef = db.collection('users').doc(provisionedBy);
    batch.update(provisionerUserRef, {
      'wallet.availableKeys': admin.firestore.FieldValue.increment(-1),
      'wallet.totalProvisioned': admin.firestore.FieldValue.increment(1),
    });

    await batch.commit();

    await logKeyTransaction({
      keyIds: [keyId],
      fromUser: provisionedBy,
      toUser: endUserId,
      action: 'provisioned',
      performedBy: provisionedBy,
      reason: `Key ${keyId} provisioned to end user ${endUserId}`,
    });

    res.json({ success: true, message: 'Key provisioned successfully' });
  } catch (error) {
    console.error('Error provisioning key:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  createKeys,
  transferKeys,
  revokeKeys,
  provisionKey
};