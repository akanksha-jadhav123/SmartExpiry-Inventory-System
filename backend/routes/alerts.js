const express = require("express");
const router = express.Router();
const ac = require("../controllers/alertController");
const { protect } = require("../middleware/authMiddleware"); // CORRECTED: Use authMiddleware

// Get the user's current alert settings
router.get("/settings", protect, ac.getSettings);

// Update alert settings
router.post("/settings", protect, ac.updateSettings);

// Get all products with their calculated expiry status (for dashboard)
router.get("/status", protect, ac.getProductsWithStatus);

module.exports = router;