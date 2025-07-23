const { admin, db } = require('../config/firebase');

// Helper function to format phone number to E.164
function formatPhoneNumberToE164(phoneNumber) {
  if (!phoneNumber) return null;
  // Remove all non-digit characters
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  // Basic check: if it doesn't start with a '+' and is not a common international format, prepend '+1' (assuming US numbers for now)
  if (!digitsOnly.startsWith('+') && digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  } else if (digitsOnly.startsWith('0') && digitsOnly.length > 1) {
    return `+${digitsOnly.substring(1)}`;
  }
  return `+${digitsOnly}`;
}

// Fetch all distributors under a specific super distributor
async function getDistributorsBySuperDistributor(req, res) {
  try {
    const { superDistributorId } = req.params;
    if (!superDistributorId) {
      return res.status(400).json({ error: 'superDistributorId is required' });
    }
    const snapshot = await db.collection('users')
      .where('role', '==', 'distributor')
      .where('superDistributorId', '==', superDistributorId)
      .get();

    const users = snapshot.docs.map(doc => {
      const data = doc.data();
      if (data.createdAt && typeof data.createdAt.toDate === 'function') {
        data.createdAt = data.createdAt.toDate().toISOString();
      }
      return { _id: doc.id, ...data };
    });

    res.json({ users });
  } catch (error) {
    console.error('Error fetching distributors by super distributor:', error);
    res.status(500).json({ error: error.message });
  }
}

async function createSuperDistributor(req, res) {
  try {
    const { email, name, phone, password } = req.body;
    console.log('Creating super distributor with data:', { email, name, phone });

    if (!email || !name || !phone || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const formattedPhoneNumber = formatPhoneNumberToE164(phone);
    const authCreationData = { email, password, displayName: name };
    if (formattedPhoneNumber) {
      authCreationData.phoneNumber = formattedPhoneNumber;
    }

    // Check if user already exists
    try {
      const existingUser = await admin.auth().getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ error: 'The email address is already in use by another account.' });
      }
    } catch (error) {
      // User doesn't exist, continue with creation
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
    }

    const userRecord = await admin.auth().createUser(authCreationData);
    console.log('Created Firebase auth user:', userRecord);

    // Set custom claims for role
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role: 'super_distributor'
    });

    const userData = {
      uid: userRecord.uid,
      email,
      name,
      phone,
      role: "super_distributor",
      hierarchy: {
        superAdmin: req.user.uid
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "active",
      // Add wallet structure
      wallet: {
        availableKeys: 0,
        totalKeysReceived: 0,
        totalKeysTransferred: 0,
        totalProvisioned: 0,
        totalRevoked: 0
      }
    };

    console.log('Storing super distributor data in Firestore:', userData);
    await db.collection('users').doc(userRecord.uid).set(userData);
    console.log('Successfully stored super distributor data');

    res.json({ success: true, user: userData });
  } catch (error) {
    console.error('Error creating super distributor:', error);
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

    const superDistributorDoc = await db.collection('users').doc(superDistributorId).get();
    if (!superDistributorDoc.exists || superDistributorDoc.data().role !== 'super-distributor') {
      return res.status(400).json({ error: 'Invalid super distributor' });
    }

    const formattedPhoneNumber = formatPhoneNumberToE164(phone);
    const authCreationData = { email, password, displayName: name };
    if (formattedPhoneNumber) {
      authCreationData.phoneNumber = formattedPhoneNumber;
    }

    const userRecord = await admin.auth().createUser(authCreationData);

    const hierarchy = { superDistributor: superDistributorId };
    const superAdminValue = superDistributorDoc.data().hierarchy?.superAdmin;
    if (superAdminValue !== undefined) {
      hierarchy.superAdmin = superAdminValue;
    }

    const userData = {
      uid: userRecord.uid,
      email,
      name,
      phone,
      role: "distributor",
      parentId: superDistributorId,
      superDistributorId,
      hierarchy,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "active",
      // Add wallet structure for consistency
      wallet: {
        availableKeys: 0,
        totalKeysReceived: 0,
        totalKeysTransferred: 0,
        totalProvisioned: 0,
        totalRevoked: 0
      }
    };

    await db.collection('users').doc(userRecord.uid).set(userData, { merge: true });
    res.json({ success: true, user: userData });
  } catch (error) {
    console.error('Error creating distributor:', error);
    if (error.code === 'auth/email-already-in-use') {
      return res.status(409).json({ error: 'The email address is already in use by another account.' });
    }
    res.status(500).json({ error: error.message });
  }
}

async function createRetailer(req, res) {
  try {
    const { email, name, phone, password, shopName, paymentQr, superDistributorId, distributorId } = req.body;
    console.log('Creating retailer with data:', {
      email,
      name,
      phone,
      shopName,
      paymentQr,
      superDistributorId,
      distributorId
    });

    if (!superDistributorId || !distributorId || !email || !name || !phone || !password || !shopName || !paymentQr) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const superDistributorDoc = await db.collection('users').doc(superDistributorId).get();
    const distributorDoc = await db.collection('users').doc(distributorId).get();

    console.log('Super Distributor data:', superDistributorDoc.data());
    console.log('Distributor data:', distributorDoc.data());

    if (!superDistributorDoc.exists || superDistributorDoc.data().role !== 'super-distributor') {
      return res.status(400).json({ error: 'Invalid super distributor' });
    }
    if (!distributorDoc.exists || distributorDoc.data().role !== 'distributor' || distributorDoc.data().parentId !== superDistributorId) {
      return res.status(400).json({ error: 'Invalid distributor' });
    }

    const formattedPhoneNumber = formatPhoneNumberToE164(phone);
    const authCreationData = { email, password, displayName: name };
    if (formattedPhoneNumber) {
      authCreationData.phoneNumber = formattedPhoneNumber;
    }

    const userRecord = await admin.auth().createUser(authCreationData);
    console.log('Created Firebase auth user:', userRecord);

    const userData = {
      uid: userRecord.uid,
      email,
      name,
      phone,
      shopName,
      paymentQr,
      role: "retailer",
      // Set both parentId and distributorId for backwards compatibility
      parentId: distributorId,
      distributorId: distributorId,
      superDistributorId: superDistributorId,
      // Set complete hierarchy
      hierarchy: {
        superAdmin: distributorDoc.data().hierarchy?.superAdmin,
        superDistributor: superDistributorId,
        distributor: distributorId
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "active",
      // Add wallet structure for consistency
      wallet: {
        availableKeys: 0,
        totalKeysReceived: 0,
        totalKeysTransferred: 0,
        totalProvisioned: 0,
        totalRevoked: 0
      }
    };

    console.log('Storing retailer data in Firestore:', userData);
    await db.collection('users').doc(userRecord.uid).set(userData);
    console.log('Successfully stored retailer data');

    res.json({ success: true, user: userData });
  } catch (error) {
    console.error('Error creating retailer:', error);
    if (error.code === 'auth/email-already-in-use') {
      return res.status(409).json({ error: 'The email address is already in use by another account.' });
    }
    res.status(500).json({ error: error.message });
  }
}

async function getHierarchy(req, res) {
  try {
    const { role, uid } = req.user;
    console.log('Getting hierarchy for role:', role, 'uid:', uid);

    // Normalize role to handle different formats
    const normalizeRole = (r) => r.toLowerCase().replace(/[-_]/g, '');
    const normalizedRole = normalizeRole(role);

    if (normalizedRole === 'superadmin') {
      const snapshot = await db.collection('users').get();
      const users = snapshot.docs
        .map(doc => ({ uid: doc.id, ...doc.data() }))
        .filter(user => user.uid !== uid); // Exclude the admin themselves
      return res.json({ success: true, users });
    }

    const hierarchyMap = {
      superadmin: { role: 'super-distributor', field: 'uid' },
      superdistributor: { role: 'distributor', field: 'hierarchy.superDistributor' },
      distributor: { role: 'retailer', field: ['hierarchy.distributor', 'parentId', 'distributorId'] }
    };

    let query = db.collection('users');
    let users = [];

    if (normalizedRole === 'retailer') {
      // Retailers can only see their end users
      query = db.collection('endUsers').where('retailerId', '==', uid);
      const snapshot = await query.get();
      users = snapshot.docs.map(doc => {
        const data = doc.data();
        if (data.createdAt && typeof data.createdAt.toDate === 'function') {
          data.createdAt = data.createdAt.toDate().toISOString();
        }
        return { uid: doc.id, ...data };
      });
      return res.json({ success: true, users });
    } 
    
    if (!hierarchyMap[normalizedRole]) {
      console.log('No matching hierarchy rule found for role:', normalizedRole);
      return res.json({ success: true, users: [] });
    }

    const { role: childRole, field } = hierarchyMap[normalizedRole];
    console.log('Looking for child role:', childRole, 'using field:', field);

    if (normalizedRole === 'superadmin') {
      query = query.where('role', '==', childRole);
      const snapshot = await query.get();
      users = snapshot.docs.map(doc => {
        const data = doc.data();
        if (data.createdAt && typeof data.createdAt.toDate === 'function') {
          data.createdAt = data.createdAt.toDate().toISOString();
        }
        return { uid: doc.id, ...data };
      });
    } else if (Array.isArray(field)) {
      // For distributor->retailer case, check all possible fields
      console.log('Distributor searching for retailers. Distributor ID:', uid);
      console.log('Checking fields:', field);
      
      const queries = field.map(f => {
        console.log(`Creating query for field ${f} with value ${uid}`);
        return db.collection('users')
          .where('role', '==', childRole)
          .where(f, '==', uid)
          .get();
      });
      
      const snapshots = await Promise.all(queries);
      const uniqueUsers = new Map();
      
      snapshots.forEach((snapshot, index) => {
        console.log(`Query ${index} for field ${field[index]} returned ${snapshot.size} results`);
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          console.log(`Found user: ${data.name}, role: ${data.role}, distributorId: ${data.distributorId}, parentId: ${data.parentId}, hierarchy:`, data.hierarchy);
          if (!uniqueUsers.has(doc.id)) {
            if (data.createdAt && typeof data.createdAt.toDate === 'function') {
              data.createdAt = data.createdAt.toDate().toISOString();
            }
            uniqueUsers.set(doc.id, { uid: doc.id, ...data });
          }
        });
      });
      
      users = Array.from(uniqueUsers.values());
      console.log(`Found ${users.length} unique retailers for distributor ${uid}`);
      console.log('Final users list:', users);
    } else {
      // For other cases (super distributor -> distributor)
      query = query
        .where('role', '==', childRole)
        .where(field, '==', uid);
      
      const snapshot = await query.get();
      users = snapshot.docs.map(doc => {
        const data = doc.data();
        if (data.createdAt && typeof data.createdAt.toDate === 'function') {
          data.createdAt = data.createdAt.toDate().toISOString();
        }
        return { uid: doc.id, ...data };
      });
    }

    // Add parent information to each user
    users = await Promise.all(users.map(async user => {
      let parentInfo = null;
      if (user.parentId) {
        const parentDoc = await db.collection('users').doc(user.parentId).get();
        if (parentDoc.exists) {
          const parentData = parentDoc.data();
          parentInfo = {
            id: parentDoc.id,
            name: parentData.name,
            role: parentData.role
          };
        }
      }
      return { ...user, parent: parentInfo };
    }));

    console.log('Returning users:', users);
    res.json({ success: true, users });
  } catch (error) {
    console.error('Error in getHierarchy:', error);
    res.status(500).json({ error: error.message });
  }
}

async function getUserDetails(req, res) {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    // Convert timestamps to ISO strings
    if (userData.createdAt && typeof userData.createdAt.toDate === 'function') {
      userData.createdAt = userData.createdAt.toDate().toISOString();
    }

    res.json({
      uid: userDoc.id,
      ...userData
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ error: error.message });
  }
}

async function getMe(req, res) {
  try {
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    const userData = userDoc.data();
    res.json({ success: true, user: userData });
  } catch (error) {
    console.error('Error getting user data:', error);
    res.status(500).json({ error: error.message });
  }
}

async function getUsersByRole(req, res) {
  try {
    const { role } = req.params;
    const snapshot = await db.collection('users').where('role', '==', role).get();
    const users = snapshot.docs.map(doc => {
      const data = doc.data();
      if (data.createdAt && typeof data.createdAt.toDate === 'function') {
        data.createdAt = data.createdAt.toDate().toISOString();
      }
      return { uid: doc.id, ...data };
    });
    res.json({ success: true, users });
  } catch (error) {
    console.error('Error getting users by role:', error);
    res.status(500).json({ error: error.message });
  }
}

async function getAllUsers(req, res) {
  try {
    const { role, uid } = req.user;
    console.log('Getting hierarchy for role:', role, 'uid:', uid);

    // Normalize role to handle different formats
    const normalizeRole = (r) => r.toLowerCase().replace(/[-_]/g, '');
    const normalizedRole = normalizeRole(role);

    if (normalizedRole === 'superadmin') {
      const snapshot = await db.collection('users').get();
      const users = snapshot.docs
        .map(doc => ({ uid: doc.id, ...doc.data() }))
        .filter(user => user.uid !== uid); // Exclude the admin themselves
      return res.json({ success: true, users });
    }

    const hierarchyMap = {
      superadmin: { role: 'super-distributor', field: 'uid' },
      superdistributor: { role: 'distributor', field: 'hierarchy.superDistributor' },
      distributor: { role: 'retailer', field: ['hierarchy.distributor', 'parentId', 'distributorId'] }
    };

    let query = db.collection('users');
    let users = [];

    if (normalizedRole === 'retailer') {
      // Retailers can only see their end users
      query = db.collection('endUsers').where('retailerId', '==', uid);
      const snapshot = await query.get();
      users = snapshot.docs.map(doc => {
        const data = doc.data();
        if (data.createdAt && typeof data.createdAt.toDate === 'function') {
          data.createdAt = data.createdAt.toDate().toISOString();
        }
        return { uid: doc.id, ...data };
      });
      return res.json({ success: true, users });
    } 
    
    if (!hierarchyMap[normalizedRole]) {
      console.log('No matching hierarchy rule found for role:', normalizedRole);
      return res.json({ success: true, users: [] });
    }

    const { role: childRole, field } = hierarchyMap[normalizedRole];
    console.log('Looking for child role:', childRole, 'using field:', field);

    if (normalizedRole === 'superadmin') {
      query = query.where('role', '==', childRole);
      const snapshot = await query.get();
      users = snapshot.docs.map(doc => {
        const data = doc.data();
        if (data.createdAt && typeof data.createdAt.toDate === 'function') {
          data.createdAt = data.createdAt.toDate().toISOString();
        }
        return { uid: doc.id, ...data };
      });
    } else if (Array.isArray(field)) {
      // For distributor->retailer case, check all possible fields
      console.log('Distributor searching for retailers. Distributor ID:', uid);
      console.log('Checking fields:', field);
      
      const queries = field.map(f => {
        console.log(`Creating query for field ${f} with value ${uid}`);
        return db.collection('users')
          .where('role', '==', childRole)
          .where(f, '==', uid)
          .get();
      });
      
      const snapshots = await Promise.all(queries);
      const uniqueUsers = new Map();
      
      snapshots.forEach((snapshot, index) => {
        console.log(`Query ${index} for field ${field[index]} returned ${snapshot.size} results`);
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          console.log(`Found user: ${data.name}, role: ${data.role}, distributorId: ${data.distributorId}, parentId: ${data.parentId}, hierarchy:`, data.hierarchy);
          if (!uniqueUsers.has(doc.id)) {
            if (data.createdAt && typeof data.createdAt.toDate === 'function') {
              data.createdAt = data.createdAt.toDate().toISOString();
            }
            uniqueUsers.set(doc.id, { uid: doc.id, ...data });
          }
        });
      });
      
      users = Array.from(uniqueUsers.values());
      console.log(`Found ${users.length} unique retailers for distributor ${uid}`);
      console.log('Final users list:', users);
    } else {
      // For other cases (super distributor -> distributor)
      query = query
        .where('role', '==', childRole)
        .where(field, '==', uid);
      
      const snapshot = await query.get();
      users = snapshot.docs.map(doc => {
        const data = doc.data();
        if (data.createdAt && typeof data.createdAt.toDate === 'function') {
          data.createdAt = data.createdAt.toDate().toISOString();
        }
        return { uid: doc.id, ...data };
      });
    }

    // Add parent information to each user
    users = await Promise.all(users.map(async user => {
      let parentInfo = null;
      if (user.parentId) {
        const parentDoc = await db.collection('users').doc(user.parentId).get();
        if (parentDoc.exists) {
          const parentData = parentDoc.data();
          parentInfo = {
            id: parentDoc.id,
            name: parentData.name,
            role: parentData.role
          };
        }
      }
      return { ...user, parent: parentInfo };
    }));

    console.log('Returning users:', users);
    res.json({ success: true, users });
  } catch (error) {
    console.error('Error in getHierarchy:', error);
    res.status(500).json({ error: error.message });
  }
}

async function getAllUsers(req, res) {
  try {
    const snapshot = await db.collection('users').get();
    const users = snapshot.docs.map(doc => {
      const data = doc.data();
      if (data.createdAt && typeof data.createdAt.toDate === 'function') {
        data.createdAt = data.createdAt.toDate().toISOString();
      }
      return { uid: doc.id, ...data };
    });
    res.json({ success: true, users });
  } catch (error) {
    console.error('Error getting all users:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getDistributorsBySuperDistributor,
  createSuperDistributor,
  createDistributor,
  createRetailer,
  getHierarchy,
  getMe,
  getUsersByRole,
  getAllUsers,
  getUserDetails
};