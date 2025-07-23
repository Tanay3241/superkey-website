const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { authenticateUser, requireRole } = require('../middleware/authMiddleware'); // Corrected import
const { 
  getUserDetails,
  getUsersByRole,
  getAllUsers,
  createSuperDistributor,
  createDistributor,
  createRetailer,
  getDistributorsBySuperDistributor,
  getMe,
  getHierarchy
} = require('../controllers/usersController');

// Get user details
router.get('/:userId', authenticateUser, getUserDetails);

// Get all users (Super Admin only)
router.get('/', authenticateUser, requireRole(['super_admin']), getAllUsers);

// Create Super Distributor
router.post('/super-distributor', authenticateUser, requireRole(['super_admin']), createSuperDistributor);

// Create Distributor
router.post('/distributor', authenticateUser, requireRole(['super_admin', 'super_distributor']), createDistributor);

// Create Retailer
router.post('/retailer', authenticateUser, requireRole(['super_admin', 'super_distributor', 'distributor']), createRetailer);

// GET /api/users/me
router.get('/me', authenticateUser, getMe);

// Get users under current user
router.get('/hierarchy',
  authenticateUser,
  requireRole(['super_admin', 'super_distributor', 'distributor', 'retailer']),
  getHierarchy
);

// Get users by role
router.get('/by-role/:role', authenticateUser, getUsersByRole);

// Get distributors by super distributor
router.get(
  '/distributors/by-super-distributor/:superDistributorId',
  authenticateUser,
  requireRole(['super_admin', 'super_distributor']),
  getDistributorsBySuperDistributor
);

// Get current user's wallet
router.get('/wallet',
  authenticateUser,
  requireRole(['super_admin', 'super_distributor', 'distributor', 'retailer']),
  async (req, res) => {
    try {
      const userDoc = await db.collection('users').doc(req.user.uid).get();
      const wallet = userDoc.data().wallet;

      res.json({ wallet });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.get('/recipients', authenticateUser, async (req, res) => { // Changed 'auth' to 'authenticateUser'
  try {
    const allowedRoles = ['super_distributor', 'distributor', 'retailer', 'endUser'];
    const snapshot = await db.collection('users').where('role', 'in', allowedRoles).get();
    const recipients = snapshot.docs.map(doc => ({
      _id: doc.id, // Map doc.id to _id
      username: doc.data().name || doc.data().email, // Use name or email as username
      role: doc.data().role, // Explicitly include the role
      ...doc.data()
    }));
    res.status(200).json(recipients);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;