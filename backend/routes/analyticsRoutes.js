const express = require('express');
const { protect, isAdminOrStaff } = require('../middleware/authMiddleware');
const { getSummaryAnalytics } = require('../controllers/analyticsController');
const router = express.Router();

// GET /api/analytics/summary - View Reports (Staff)
router.get('/summary', protect, isAdminOrStaff, getSummaryAnalytics);

module.exports = router;