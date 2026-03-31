const express = require('express');
const { getAllLocations } = require('../controllers/locationController');
const { protect } = require('../middleware/authMiddleware'); // CORRECTED: Use authMiddleware
const router = express.Router();

router.get('/', protect, getAllLocations);

module.exports = router;