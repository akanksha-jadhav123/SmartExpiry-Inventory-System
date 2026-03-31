// routes/shopRoutes.js
const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shopController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

router.get('/available', shopController.getAvailableShops);
router.use(protect);
router.get('/', isAdmin, shopController.getAllShops);
router.post('/', isAdmin, shopController.createShop);
router.get('/:id', shopController.getShopById);
router.get('/:id/users', shopController.getShopUsers);

module.exports = router;