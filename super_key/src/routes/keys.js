const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { requireRole, authenticateUser } = require('../middleware/authMiddleware');

const { createKeys, transferKeys, revokeKeys, getKeyTransactions } = require('../controllers/keysController');


// 1. Generate Keys (Super Admin only)
router.post('/generate', authenticateUser, requireRole(['super_admin']), createKeys);


// 2. Transfer Keys Down the Hierarchy
router.post('/transfer', authenticateUser, transferKeys);

// 3. Revoke Key (Super Admin only, not provisioned)
router.post('/revoke', authenticateUser, requireRole(['super_admin']), revokeKeys);

// 4. key transactions with pagination
router.get('/transactions', authenticateUser, getKeyTransactions);

module.exports = { router };
