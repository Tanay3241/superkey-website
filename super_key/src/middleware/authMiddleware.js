const { admin, db } = require('../config/firebase');

const requireRole = (roles) => {
  return async (req, res, next) => {
    console.log('Inside requireRole middleware.');
    console.log('requireRole: req.user:', req.user);
    try {
      console.log('requireRole: Fetching user data for UID:', req.user.uid);
      const userDoc = await db.collection('users').doc(req.user.uid).get();

      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }

      const userData = userDoc.data();
      if (!roles.includes(userData.role)) {
        console.log('requireRole: User does not have required role. User role:', userData.role, 'Required roles:', roles);
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      req.userData = userData;
      next();
    } catch (error) {
    console.error('Authorization error:', error);
    console.error('Full authorization error stack:', error.stack);
    return res.status(500).json({ error: 'Authorization failed' });
    }
  };
};

const authenticateUser = async (req, res, next) => {
  try {
    console.log('Inside authenticateUser middleware.');
    console.log('authenticateUser: Received cookies (from req.cookies):', req.cookies);
    console.log('authenticateUser: Session ID (req.sessionID):', req.sessionID);
    console.log('Session cookie value (req.cookies[\'connect.sid\']):', req.cookies['connect.sid']);
    console.log('Raw Cookie Header (from req.headers.cookie):', req.headers.cookie);
    let decoded;

    // Check for session (web)
    if (req.session && req.session.uid) {
      console.log('authenticateUser: Session found with UID:', req.session.uid);
    console.log('authenticateUser: Session object:', req.session);
      decoded = { uid: req.session.uid }; // Create a decoded object similar to what verifyIdToken would return
    }
    // Check for Bearer token (mobile)
    else if (req.headers.authorization?.startsWith('Bearer ')) {
      const idToken = req.headers.authorization.split('Bearer ')[1];
      decoded = await admin.auth().verifyIdToken(idToken);
    } else {
      return res.status(401).json({ error: 'Unauthorized request' });
    }

    req.user = decoded;
    console.log('authenticateUser: req.user populated with UID:', req.user.uid);
    next();
  } catch (err) {
    console.error('authenticateUser: Authentication error:', err);
    console.error('authenticateUser: Error details:', err.message, err.stack);

    res.status(401).json({ error: 'Unauthorized' });
  }
};

module.exports = { requireRole, authenticateUser };