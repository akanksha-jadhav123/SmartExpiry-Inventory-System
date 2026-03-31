const express = require("express");
const router = express.Router();
const bc = require("../controllers/billingController");
const { protect } = require("../middleware/authMiddleware");

// Protect all billing routes
router.use(protect);

// POST /api/billing - Create a new bill (sale transaction)
router.post("/", bc.createBill);

// GET /api/billing - Get all bills for the user
router.get("/", bc.getAllBills);

// GET /api/billing/:id - Get details of a specific bill
router.get("/:id", bc.getBillDetails);

module.exports = router;