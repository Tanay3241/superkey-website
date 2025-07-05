const express = require('express');
const router = express.Router();
const { requireRole, authenticateUser } = require('../middleware/authMiddleware');
const { createEndUser } = require('../controllers/endUsersController');

router.post('/create', authenticateUser, requireRole(['retailer']), createEndUser);

module.exports = { router };