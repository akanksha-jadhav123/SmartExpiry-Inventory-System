const express = require('express');
const { register, login } = require('../controllers/authController');
const { 
    forgotPassword, 
    resetPassword, 
    validateResetToken 
} = require('../controllers/passwordResetController');

const router = express.Router();

// Existing routes
router.post('/register', register);
router.post('/login', login);

// New password reset routes
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/validate-reset-token/:token', validateResetToken);

module.exports = router;