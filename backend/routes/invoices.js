const express = require("express");
const router = express.Router();
const ic = require("../controllers/invoiceController");
const { protect } = require("../middleware/authMiddleware"); // CORRECTED: Use authMiddleware

// Route to create a new invoice
router.post("/", protect, ic.createInvoice);

// Route to get a list of all invoices
router.get("/", protect, ic.getInvoices);

// Route to get detailed view of a single invoice
router.get("/:id", protect, ic.getInvoiceDetails);

module.exports = router;