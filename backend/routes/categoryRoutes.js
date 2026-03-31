const express = require('express');
const { getAllCategories } = require('../controllers/categoryController');
const { protect } = require('../middleware/authMiddleware'); // CORRECTED: Use authMiddleware
const router = express.Router();

router.get('/', protect, getAllCategories);

module.exports = router;