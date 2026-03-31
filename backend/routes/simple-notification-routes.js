const express = require("express");
const router = express.Router();
const { simpleExpiryCheck } = require("../controllers/simple-notification-controller");
const { protect, isAdmin } = require("../middleware/authMiddleware");

// Simple expiry check endpoint
router.post("/simple-check", protect, isAdmin, simpleExpiryCheck);

module.exports = router;