const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { authenticateUser, requireRole } = require('../middleware/authMiddleware');
const usersController = require('../controllers/usersController');
const { getUsersByRole } = usersController;

// Create Super Distributor
router.post('/super-distributor', authenticateUser, requireRole(['super_admin']), usersController.createSuperDistributor);

// Create Distributor
router.post('/distributor', authenticateUser, requireRole(['super_admin', 'super_distributor']), usersController.createDistributor);

// Create Retailer
router.post('/retailer', authenticateUser, requireRole(['super_admin', 'distributor']), usersController.createRetailer);



// GET /api/users/me
router.get('/me', authenticateUser, usersController.getMe);

// Get users under current user
router.get('/hierarchy',
  authenticateUser,
  requireRole(['super_admin', 'super_distributor', 'distributor', 'retailer']),
  usersController.getHierarchy
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

// Get users by role
router.get('/by-role/:role', authenticateUser, requireRole(['super_admin']), (req, res, next) => {
  console.log(`users.js: Route /by-role/${req.params.role} hit.`);
  next();
}, getUsersByRole);

module.exports = { router };