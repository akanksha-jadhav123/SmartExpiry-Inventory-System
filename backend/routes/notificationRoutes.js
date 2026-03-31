const express = require('express');
const router = express.Router();
const { 
    sendManualNotification, 
    testEmail,
    sendManualImmediateNotification,
    sendManualScheduledNotification,
    sendTestNotification,
    quickInventoryCheck
} = require('../controllers/notificationController');

// Simple test route to verify it works
router.get('/test', (req, res) => {
    console.log('✅ Notification test route called');
    res.json({ 
        success: true, 
        message: 'Notification routes are working!',
        timestamp: new Date().toISOString()
    });
});

// 🔔 IMMEDIATE NOTIFICATION ROUTES
router.get('/send-immediate', sendManualImmediateNotification);
router.post('/send-immediate', sendManualImmediateNotification);

// 🔔 SCHEDULED NOTIFICATION ROUTES
router.get('/send-scheduled', sendManualScheduledNotification);
router.post('/send-scheduled', sendManualScheduledNotification);

// 🧪 TEST NOTIFICATION ROUTES
router.get('/send-test', sendTestNotification);
router.post('/send-test', sendTestNotification);

// ⚡ QUICK CHECK ROUTE
router.get('/quick-check', quickInventoryCheck);
router.post('/quick-check', quickInventoryCheck);

// Legacy routes for compatibility
router.get('/send-manual', sendManualScheduledNotification);
router.post('/send-manual', sendManualScheduledNotification);

// Test email configuration
router.get('/test-email', testEmail);

// User-specific immediate notifications
router.get('/send-my-alerts', sendManualImmediateNotification);
router.post('/send-my-alerts', sendManualImmediateNotification);

module.exports = router;