const express = require('express');
const { protect, isAdmin } = require('../middleware/authMiddleware');
const { 
    getProfile,
    updateProfile,
    changePassword,
    getAllUsers, 
    getUserById,
    updateUser,  
    deleteUser,
    debugUserInfo
} = require('../controllers/userController');

const router = express.Router();

// Profile routes (for currently logged-in user)
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);

// Debug route (temporary)
router.get('/debug/user-info', protect, debugUserInfo);

// ADMIN ONLY ROUTES
router.get('/all', protect, getAllUsers);
router.get('/:id', protect, getUserById);
router.put('/:id', protect, updateUser);
router.delete('/:id', protect, deleteUser);

module.exports = router;