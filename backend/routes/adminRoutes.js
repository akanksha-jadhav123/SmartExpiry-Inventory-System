const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

router.get('/dashboard', protect, isAdmin, adminController.getAdminDashboard);

module.exports = router;