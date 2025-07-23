const express = require('express');
const router = express.Router();
const { authenticateUser, requireRole } = require('../middleware/authMiddleware');
const { fetchTutorials, uploadTutorial } = require('../controllers/supportController');

router.post('/tutorials/upload', authenticateUser, requireRole(['super_admin']), uploadTutorial);

router.get('/tutorials/all', fetchTutorials);

module.exports = router;