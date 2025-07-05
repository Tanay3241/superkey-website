// Helper function to format phone number to E.164
function formatPhoneNumberToE164(phoneNumber) {
  if (!phoneNumber) return null;
  // Remove all non-digit characters
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  // Basic check: if it doesn't start with a '+' and is not a common international format, prepend '+1' (assuming US numbers for now)
  // This is a simplified approach; a more robust solution would involve a dedicated phone number parsing library
  if (!digitsOnly.startsWith('+') && digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  } else if (digitsOnly.startsWith('0') && digitsOnly.length > 1) {
    // Handle cases where numbers might start with 0, e.g., in some countries
    // This needs to be adapted based on the expected phone number formats from the frontend
    return `+${digitsOnly.substring(1)}`; // Example: 07xxxx -> +7xxxx
  }
  return `+${digitsOnly}`;
}
const { admin, db } = require('../config/firebase');
async function createSuperDistributor(req, res) {
  try {
    const { email, name, phone, password } = req.body;
    console.log('Inside createSuperDistributor function.');
    console.log('Request body:', req.body);
    console.log('req.user:', req.user);
    if (req.user) {
      console.log('req.user.uid:', req.user.uid);
    }
    if (!email || !name || !phone || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    // Create user in Firebase Auth
    console.log('Attempting to create user in Firebase Auth...');
    console.log('Before Firebase Auth user creation.');
    const formattedPhoneNumber = formatPhoneNumberToE164(phone);
    const authCreationData = { email, password, displayName: name };
    if (formattedPhoneNumber) {
      authCreationData.phoneNumber = formattedPhoneNumber;
    }
    const userRecord = await admin.auth().createUser(authCreationData);
    console.log('User created in Firebase Auth:', userRecord.uid);
    console.log('After Firebase Auth user creation, before Firestore data setting.');
    // Create user profile in Firestore
    const userData = {
      uid: userRecord.uid,
      email,
      name,
      phone,
      role: "super-distributor",
      receiptId: 'REC-' + userRecord.uid.substring(0, 8).toUpperCase(), // Generate a simple receipt ID
      hierarchy: {
        superDistributor: userRecord.uid // Super distributor is the top of their own hierarchy
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "active"
    };
    console.log('User data to be stored in Firestore:', userData);
    console.log('Attempting to set user data in Firestore...');
    console.log('Before Firestore data setting.');
    await db.collection('users').doc(userRecord.uid).set(userData);
    console.log('User data set in Firestore.');
    console.log('After Firestore data setting.');
    res.json({ success: true, user: userData });
  } catch (error) {
    console.error('Error creating super distributor:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    if (error.code) {
      console.error('Firebase error code:', error.code);
    }
    console.error('Full error stack:', error.stack);
    if (error.code === 'auth/email-already-in-use') {
      return res.status(409).json({ error: 'The email address is already in use by another account.' });
    }
    res.status(500).json({ error: error.message });
  }
}

async function createDistributor(req, res) {
  try {
    const { email, name, phone, password, superDistributorId } = req.body;
    if (!email || !name || !phone || !password || !superDistributorId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    // Fetch super distributor
    const superDistributorDoc = await db.collection('users').doc(superDistributorId).get();
    if (!superDistributorDoc.exists || superDistributorDoc.data().role !== 'super-distributor') {
      return res.status(400).json({ error: 'Invalid super distributor' });
    }
    // Create user in Firebase Auth
    const formattedPhoneNumber = formatPhoneNumberToE164(phone);
    const authCreationData = { email, password, displayName: name };
    if (formattedPhoneNumber) {
      authCreationData.phoneNumber = formattedPhoneNumber;
    }
    const userRecord = await admin.auth().createUser(authCreationData);
    // Create user profile in Firestore
    const userData = {
      uid: userRecord.uid,
      email,
      name,
      phone,
      role: "distributor",
      parentId: superDistributorId,
      hierarchy: {
        superAdmin: superDistributorDoc.data().hierarchy.superAdmin,
        superDistributor: superDistributorId
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "active"
    };
    await db.collection('users').doc(userRecord.uid).set(userData, { merge: true });
    res.json({ success: true, user: userData });
  } catch (error) {
    console.error('Error creating distributor:', error);
    console.error('Full error stack:', error.stack);
    if (error.code === 'auth/email-already-in-use') {
      return res.status(409).json({ error: 'The email address is already in use by another account.' });
    }
    res.status(500).json({ error: error.message });
  }
}

async function createRetailer(req, res) {
  try {
    const { email, name, phone, password, shopName, paymentQr, superDistributorId, distributorId } = req.body;
    if (!superDistributorId || !distributorId || !email || !name || !phone || !password || !shopName || !paymentQr) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    // Fetch super distributor and distributor
    const superDistributorDoc = await db.collection('users').doc(superDistributorId).get();
    const distributorDoc = await db.collection('users').doc(distributorId).get();
    if (!superDistributorDoc.exists || superDistributorDoc.data().role !== 'super-distributor') {
      return res.status(400).json({ error: 'Invalid super distributor' });
    }
    if (!distributorDoc.exists || distributorDoc.data().role !== 'distributor' || distributorDoc.data().parentId !== superDistributorId) {
      return res.status(400).json({ error: 'Invalid distributor' });
    }
    // Create user in Firebase Auth
    const formattedPhoneNumber = formatPhoneNumberToE164(phone);
    const authCreationData = { email, password, displayName: name };
    if (formattedPhoneNumber) {
      authCreationData.phoneNumber = formattedPhoneNumber;
    }
    const userRecord = await admin.auth().createUser(authCreationData);
    // Create user profile in Firestore
    const userData = {
      uid: userRecord.uid,
      email,
      name,
      phone,
      shopName,
      paymentQr,
      role: "retailer",
      parentId: distributorId,
      hierarchy: {
        superAdmin: distributorDoc.data().hierarchy.superAdmin,
        superDistributor: superDistributorId,
        distributor: distributorId
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "active"
    };
    await db.collection('users').doc(userRecord.uid).set(userData);
    res.json({ success: true, user: userData });
  } catch (error) {
    console.error('Error creating retailer:', error);
    console.error('Full error stack:', error.stack);
    if (error.code === 'auth/email-already-in-use') {
      return res.status(409).json({ error: 'The email address is already in use by another account.' });
    }
    res.status(500).json({ error: error.message });
  }
}

async function getHierarchy(req, res) {
  try {
    const { role, uid } = req.user;
    console.log('getHierarchy called by user:', { role, uid });
    console.log('User role:', role);
    console.log('User UID:', uid);
    // Determine the immediate child role and the field to query against
    const hierarchyMap = {
      super_admin: { role: 'super-distributor', field: 'uid' },
      super_distributor: { role: 'distributor', field: 'hierarchy.superDistributor' },
      distributor: { role: 'retailer', field: 'hierarchy.distributor' }
    };

    console.log('Hierarchy map for current role:', hierarchyMap[role]);
    let query = db.collection('users');

    if (role === 'retailer') {
      // Retailers see end users (assuming 'endUsers' collection exists and is relevant)
      query = db.collection('endUsers').where('retailerId', '==', uid);
    } else if (hierarchyMap[role]) {
      const { role: childRole, field } = hierarchyMap[role];
      console.log(`Querying for role: ${childRole}, where ${field} == ${uid}`);
      if (role === 'super_admin') {
        query = query.where('role', '==', childRole);
      } else {
        query = query
          .where('role', '==', childRole)
          .where(field, '==', uid);
      }
      console.log('Firestore query constructed for hierarchy:', { childRole, field, uid });
      console.log('Full query object:', query);
    }

    const snapshot = await query.get();
    const users = snapshot.docs.map(doc => {
      const data = doc.data();
      if (data.createdAt && typeof data.createdAt.toDate === 'function') {
        data.createdAt = data.createdAt.toDate().toISOString();
      }
      // Explicitly include receiptId if it exists and the role is super-distributor
      if (data.role === 'super-distributor' && data.receiptId) {
        return { uid: doc.id, ...data, receiptId: data.receiptId };
      }
      return { uid: doc.id, ...data };
    });
    res.json({ success: true, users });
  } catch (error) {
    console.error('Error getting hierarchy:', error);
    res.status(500).json({ error: error.message });
  }
}

async function getMe(req, res) {
  try {
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    const userUid = req.user.uid;

    // Fetch key counts
    let provisionedKeysSnapshot, revokedKeysSnapshot, availableKeysSnapshot, receivedKeysSnapshot, transferredKeysSnapshot;

    try {
      provisionedKeysSnapshot = await db.collection('keys').where('createdBy', '==', userUid).get();
    } catch (err) {
      console.error('Firebase query error (provisionedKeysSnapshot):', err.message);
      // This often indicates a missing composite index. Check Firebase console for index suggestions.
      throw err;
    }

    try {
      revokedKeysSnapshot = await db.collection('keys').where('assignedTo', '==', userUid).where('status', '==', 'revoked').get();
    } catch (err) {
      console.error('Firebase query error (revokedKeysSnapshot):', err.message);
      throw err;
    }

    try {
      availableKeysSnapshot = await db.collection('keys').where('assignedTo', '==', userUid).where('status', 'in', ['unassigned', 'credited']).get();
    } catch (err) {
      console.error('Firebase query error (availableKeysSnapshot):', err.message);
      throw err;
    }

    try {
      // NOTE: This query requires a composite index on `assignedTo` and `transferredFrom` fields.
      // If you encounter FAILED_PRECONDITION errors, create the index in Firebase Console.
      receivedKeysSnapshot = await db.collection('keys').where('assignedTo', '==', userUid).where('transferredFrom', '!=', null).get();
    } catch (err) {
      console.error('Firebase query error (receivedKeysSnapshot):', err.message);
      throw err;
    }

    try {
      transferredKeysSnapshot = await db.collection('keys').where('transferredFrom', '==', userUid).get();
    } catch (err) {
      console.error('Firebase query error (transferredKeysSnapshot):', err.message);
      throw err;
    }

    const walletData = {
      totalProvisioned: provisionedKeysSnapshot.size,
      revokedKeys: revokedKeysSnapshot.size,
      availableKeys: availableKeysSnapshot.size,
      totalReceived: receivedKeysSnapshot.size,
      totalTransferred: transferredKeysSnapshot.size,
    };

    res.json({ success: true, user: userDoc.data(), wallet: walletData });
  } catch (error) {
    console.error('Error getting user data:', error);
    res.status(500).json({ error: error.message });
  }
}

async function getUsersByRole(req, res) {
  try {
    const { role } = req.params;
    console.log(`getUsersByRole: Received role parameter: ${role}`);
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('role', '==', role).get();

    if (snapshot.empty) {
      console.log(`getUsersByRole: No users found with role: ${role}. Snapshot is empty.`);
      return res.status(404).json({ message: `No users found with role: ${role}` });
    }

    console.log(`getUsersByRole: Found ${snapshot.size} users with role: ${role}`);

    const users = snapshot.docs.map(doc => {
      const data = doc.data();
      if (data.createdAt && typeof data.createdAt.toDate === 'function') {
        data.createdAt = data.createdAt.toDate().toISOString();
      }
      return { _id: doc.id, ...data };
    });

    res.json({ users });
  } catch (error) {
    console.error('Error fetching users by role:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  createSuperDistributor,
  createDistributor,
  createRetailer,
  getMe,
  getHierarchy,
  getUsersByRole
};