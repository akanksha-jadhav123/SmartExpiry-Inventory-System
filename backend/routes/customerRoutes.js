const express = require("express");
const router = express.Router();
const cc = require("../controllers/customerController");
const { protect } = require("../middleware/authMiddleware"); // CORRECTED: Use authMiddleware

// All customer routes require authentication
router.get("/", protect, cc.getAll);
router.post("/", protect, cc.add);

module.exports = router;