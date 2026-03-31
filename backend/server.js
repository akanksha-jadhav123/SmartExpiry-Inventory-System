const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
require('dotenv').config();
const db = require('./db');

// Import all route files
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const locationRoutes = require('./routes/locationRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const billingRoutes = require('./routes/billingRoutes');
const customerRoutes = require('./routes/customerRoutes');
const userRoutes = require('./routes/userRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const { sendExpiryNotifications, sendImmediateNotifications } = require('./controllers/notificationController');
const realTimeNotifier = require('./controllers/realTimeNotificationController');

const app = express();

// **PORT CONFIGURATION WITH FALLBACK**
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Route Mounting
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);

// Basic home route
app.get('/', (req, res) => {
    res.json({ 
        message: 'SmartExpiry API is running...',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        port: PORT,
        features: {
            immediate_notifications: true,
            scheduled_notifications: true,
            real_time_alerts: true,
            multi_channel: true
        }
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        database: 'Connected', 
        timestamp: new Date().toISOString(),
        email_configured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS),
        notifications: {
            immediate: true,
            scheduled: true,
            realtime: true
        }
    });
});

// Enhanced notification test endpoint
app.get('/api/notification-test', async (req, res) => {
    try {
        const { sendImmediateNotifications, sendExpiryNotifications } = require('./controllers/notificationController');
        
        // Test both immediate and scheduled
        const immediateResult = await sendImmediateNotifications();
        const scheduledResult = await sendExpiryNotifications();
        
        res.json({
            success: true,
            message: 'Comprehensive notification test completed',
            tests: {
                immediate: immediateResult,
                scheduled: scheduledResult
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Notification test failed',
            error: error.message 
        });
    }
});

// **ENHANCED CRON SCHEDULES**

// 🔔 DAILY SCHEDULED NOTIFICATION: 9:00 AM every day
cron.schedule('0 9 * * *', async () => {
    console.log('\n🕘 [CRON] Running DAILY scheduled expiry check (9:00 AM)...');
    try {
        const result = await sendExpiryNotifications();
        if (result.success) {
            console.log('✅ [CRON] Daily scheduled check completed successfully');
            console.log(`📊 [CRON] Stats: ${result.details?.emails_sent || 0} emails sent for ${result.details?.products || 0} products`);
        } else {
            console.log('❌ [CRON] Daily scheduled check failed:', result.message);
        }
    } catch (error) {
        console.error('❌ [CRON] Daily scheduled check failed:', error.message);
    }
}, {
    timezone: "Asia/Kolkata"
});

// 🔔 IMMEDIATE ALERT CHECK: Every 30 minutes for urgent alerts
cron.schedule('*/30 * * * *', async () => {
    console.log('\n🔔 [CRON] Running IMMEDIATE alert check (every 30 minutes)...');
    try {
        const result = await sendImmediateNotifications();
        if (result.success) {
            if (result.summary && result.summary.total_alerts > 0) {
                console.log('🚨 [CRON] Immediate alerts found and sent:');
                console.log(`   - Urgent alerts: ${result.summary.urgent_alerts}`);
                console.log(`   - Low stock alerts: ${result.summary.low_stock_alerts}`);
                console.log(`   - Users notified: ${result.summary.users_notified}`);
            } else {
                console.log('✅ [CRON] No immediate alerts found');
            }
        } else {
            console.log('❌ [CRON] Immediate alert check failed:', result.message);
        }
    } catch (error) {
        console.error('❌ [CRON] Immediate alert check failed:', error.message);
    }
});

// 🔔 LOW STOCK CHECK: Every Monday at 10:00 AM
cron.schedule('0 10 * * 1', async () => {
    console.log('\n📦 [CRON] Running WEEKLY low stock check (Monday 10:00 AM)...');
    try {
        const [lowStockProducts] = await db.query(`
            SELECT 
                p.id, p.name, p.quantity, p.min_stock,
                c.name as category_name,
                l.name as location_name
            FROM SE_products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN locations l ON p.location_id = l.id
            WHERE p.quantity <= p.min_stock 
            AND p.quantity > 0
            ORDER BY p.quantity ASC
        `);

        if (lowStockProducts.length > 0) {
            console.log(`🚨 [CRON] Found ${lowStockProducts.length} low stock products:`);
            lowStockProducts.forEach(product => {
                console.log(`   - ${product.name}: ${product.quantity} left (min: ${product.min_stock})`);
            });

            // Send low stock notifications
            const adminUsers = await getAdminUsersWithEmail();
            for (const admin of adminUsers) {
                if (admin.email) {
                    await sendLowStockEmail(admin, lowStockProducts);
                }
            }
        } else {
            console.log('✅ [CRON] No low stock products found');
        }
    } catch (error) {
        console.error('❌ [CRON] Low stock check failed:', error.message);
    }
});

// 🔔 REAL-TIME INVENTORY SYNC: Every 10 minutes with actual checks
cron.schedule('*/10 * * * *', async () => {
    console.log('\n🔄 [CRON] Running real-time inventory sync...');
    try {
        // Check for critical alerts (expiring in 3 days or less)
        const [criticalProducts] = await db.query(`
            SELECT 
                p.id, p.name, p.batch_no, p.expiry_date, p.quantity,
                DATEDIFF(p.expiry_date, CURDATE()) as days_until_expiry,
                u.id as user_id, u.username, u.email
            FROM SE_products p
            JOIN users u ON p.user_id = u.id
            WHERE p.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 3 DAY)
            AND p.quantity > 0
            AND (u.notifications_enabled = 1 OR u.notifications_enabled IS NULL)
        `);

        if (criticalProducts.length > 0) {
            console.log(`🚨 [CRON] Found ${criticalProducts.length} CRITICAL products (expiring in 3 days):`);
            
            for (const product of criticalProducts) {
                console.log(`   - ${product.name}: ${product.days_until_expiry} days left`);
                
                // Send critical alert
                await realTimeNotifier.sendExpiryAlert(product, {
                    id: product.user_id,
                    username: product.username,
                    email: product.email
                });
            }
        }

        // Sync with connected clients
        if (realTimeNotifier.io) {
            const connectedUsers = realTimeNotifier.connectedUsers.size;
            realTimeNotifier.io.emit('inventory-sync', { 
                timestamp: new Date().toISOString(),
                critical_alerts: criticalProducts.length,
                connected_users: connectedUsers,
                message: 'Inventory data synchronized'
            });
            console.log(`📡 [CRON] Real-time sync sent to ${connectedUsers} connected users`);
        }

        console.log('✅ [CRON] Real-time sync completed');

    } catch (error) {
        console.error('❌ [CRON] Real-time sync failed:', error.message);
    }
});

// Helper function to get admin users
async function getAdminUsersWithEmail() {
    try {
        const [users] = await db.query(`
            SELECT u.id, u.username, u.email, u.phone 
            FROM users u 
            WHERE u.role_id = 1
            AND u.email IS NOT NULL 
            AND u.email != ''
            AND (u.notifications_enabled = 1 OR u.notifications_enabled IS NULL)
        `);
        return users;
    } catch (error) {
        console.error('Error fetching admin users:', error);
        return [];
    }
}

// Helper function to send low stock email
async function sendLowStockEmail(admin, products) {
    try {
        const nodemailer = require('nodemailer');
        
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: process.env.EMAIL_PORT || 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        let productsTable = '';
        products.forEach((product, index) => {
            productsTable += `
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;">${index + 1}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${product.name}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${product.category_name || 'N/A'}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${product.location_name || 'N/A'}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; color: #e74c3c; font-weight: bold;">${product.quantity}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${product.min_stock || 10}</td>
                </tr>
            `;
        });

        const mailOptions = {
            from: {
                name: 'SmartExpiry System',
                address: process.env.EMAIL_USER
            },
            to: admin.email,
            subject: `📦 Low Stock Alert: ${products.length} Product(s) Need Restocking - SmartExpiry`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
                    <div style="background: #e67e22; color: white; padding: 20px; text-align: center;">
                        <h1>📦 Low Stock Alert</h1>
                        <p>SmartExpiry Inventory Management System</p>
                    </div>
                    <div style="padding: 20px;">
                        <h2>Hello ${admin.username},</h2>
                        <p>You have <strong>${products.length} product(s)</strong> that are running low on stock and need restocking.</p>
                        
                        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                            <thead>
                                <tr style="background: #34495e; color: white;">
                                    <th style="padding: 10px; border: 1px solid #ddd;">#</th>
                                    <th style="padding: 10px; border: 1px solid #ddd;">Product Name</th>
                                    <th style="padding: 10px; border: 1px solid #ddd;">Category</th>
                                    <th style="padding: 10px; border: 1px solid #ddd;">Location</th>
                                    <th style="padding: 10px; border: 1px solid #ddd;">Current Stock</th>
                                    <th style="padding: 10px; border: 1px solid #ddd;">Min Stock</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${productsTable}
                            </tbody>
                        </table>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" 
                               style="background: #e67e22; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                                View Dashboard
                            </a>
                        </div>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Low stock email sent to: ${admin.email}`);

    } catch (error) {
        console.error(`❌ Failed to send low stock email to ${admin.email}:`, error.message);
    }
}

// **ENHANCED SERVER STARTUP WITH ERROR HANDLING**
function startServer(port) {
    const server = app.listen(port, () => {
        console.log(`\n🚀 Server is running on port ${port}`);
        console.log(`📱 API available at: http://localhost:${port}`);
        console.log(`❤️  Health check: http://localhost:${port}/health`);
        console.log(`🔔 Notification test: http://localhost:${port}/api/notification-test`);
        
        // Display enhanced cron job info
        console.log('\n📅 ENHANCED CRON JOBS:');
        console.log('   🕘 9:00 AM Daily - Scheduled Expiry Check (30 days)');
        console.log('   🔔 Every 30 mins - Immediate Alert Check (7 days + low stock)');
        console.log('   📦 Monday 10:00 AM - Weekly Low Stock Report');
        console.log('   🔄 Every 10 mins - Real-time Critical Alerts (3 days)');
        
        console.log('\n🎯 NOTIFICATION ENDPOINTS:');
        console.log(`   📧 Email test: http://localhost:${port}/api/notifications/test-email`);
        console.log(`   🚀 Immediate: http://localhost:${port}/api/notifications/send-immediate`);
        console.log(`   📅 Scheduled: http://localhost:${port}/api/notifications/send-scheduled`);
        console.log(`   🧪 Test All: http://localhost:${port}/api/notifications/send-test`);
        console.log(`   ⚡ Quick Check: http://localhost:${port}/api/notifications/quick-check`);
        
        console.log('\n✅ Server initialization completed successfully!');
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`⚠️  Port ${port} is busy, trying port ${port + 1}...`);
            startServer(port + 1);
        } else {
            console.error('❌ Server startup error:', err);
            process.exit(1);
        }
    });

    return server;
}

// **GRACEFUL SHUTDOWN HANDLING**
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Server termination signal received...');
    process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Promise Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// **START THE SERVER**
startServer(PORT);