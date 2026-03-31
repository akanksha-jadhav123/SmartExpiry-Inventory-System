const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const { protect } = require("../middleware/authMiddleware");

// All product routes are protected by the auth middleware

// Basic CRUD operations
router.get("/dashboard", protect, productController.getDashboardProducts);
router.post("/", protect, productController.createProduct);
router.put("/:id", protect, productController.updateProduct);
router.delete("/:id", protect, productController.deleteProduct);

// Product management
router.get("/", protect, productController.getProducts);
router.post("/add", protect, productController.addProduct);

// Scanner functionality
router.post("/scan", protect, productController.processScannedProduct);
router.get("/scanner-data", protect, productController.getScannerData);
router.get("/barcode/:barcode", protect, productController.getProductByBarcode);

// Bulk operations
router.put("/bulk/update", protect, productController.bulkUpdateProducts);

// Search functionality
router.get("/search/:query", protect, productController.searchProducts);

module.exports = router;