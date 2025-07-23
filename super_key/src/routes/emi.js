const express = require('express');
const router = express.Router();
const { authenticateUser, requireRole } = require('../middleware/authMiddleware');
const { payEMI, fetchEmiLogs } = require('../controllers/emiController');

router.post('/pay', authenticateUser, requireRole(['retailer']), payEMI);

router.get('/logs/:endUserId', authenticateUser, requireRole(['retailer']), fetchEmiLogs);

module.exports = router;