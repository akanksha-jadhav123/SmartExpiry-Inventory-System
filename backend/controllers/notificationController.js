const db = require('../db');
const nodemailer = require('nodemailer');
const realTimeNotifier = require('./realTimeNotificationController');

// Enhanced function to get user email for notifications
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

// Get all users with notification preferences
async function getAllUsersWithNotifications() {
    try {
        const [users] = await db.query(`
            SELECT u.id, u.username, u.email, u.phone, u.role_id,
                   COALESCE(uns.email_notifications, 1) as email_notifications,
                   COALESCE(uns.sms_notifications, 0) as sms_notifications,
                   COALESCE(uns.whatsapp_notifications, 0) as whatsapp_notifications
            FROM users u
            LEFT JOIN user_notification_settings uns ON u.id = uns.user_id
            WHERE u.email IS NOT NULL 
            AND u.email != ''
            AND (u.notifications_enabled = 1 OR u.notifications_enabled IS NULL)
        `);
        return users;
    } catch (error) {
        console.error('Error fetching users with notifications:', error);
        return [];
    }
}

// Create email transporter
function createEmailTransporter() {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.log('❌ Email credentials not configured in environment variables');
            return null;
        }

        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: process.env.EMAIL_PORT || 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        return transporter;
    } catch (error) {
        console.error('❌ Email transporter creation failed:', error);
        return null;
    }
}

// 🔔 IMMEDIATE NOTIFICATION FUNCTION
exports.sendImmediateNotifications = async (userId = null) => {
    try {
        console.log('🚀 Starting IMMEDIATE notifications check...');
        
        let users = [];
        if (userId) {
            // Send to specific user only
            const [user] = await db.query(`
                SELECT u.id, u.username, u.email, u.phone, u.role_id
                FROM users u 
                WHERE u.id = ? 
                AND u.email IS NOT NULL 
                AND u.email != ''
            `, [userId]);
            users = user;
        } else {
            // Send to all admin users
            users = await getAdminUsersWithEmail();
        }
        
        if (users.length === 0) {
            console.log('❌ No users with valid email addresses found.');
            return { 
                success: false, 
                message: 'No users with valid email addresses found',
                type: 'immediate'
            };
        }

        console.log(`👥 Found ${users.length} users for immediate notifications:`);
        users.forEach(user => {
            console.log(`   - ${user.username} (${user.email})`);
        });

        // Get expiring products (within 7 days - URGENT)
        const [urgentProducts] = await db.query(`
            SELECT p.id, p.name, p.batch_no, p.expiry_date, p.quantity, p.user_id,
                   DATEDIFF(p.expiry_date, CURDATE()) as days_until_expiry
            FROM SE_products p 
            WHERE p.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
            AND p.quantity > 0
            ORDER BY p.expiry_date ASC
        `);

        // Get low stock products (less than 10 items)
        const [lowStockProducts] = await db.query(`
            SELECT p.id, p.name, p.batch_no, p.expiry_date, p.quantity, p.user_id,
                   DATEDIFF(p.expiry_date, CURDATE()) as days_until_expiry
            FROM SE_products p 
            WHERE p.quantity < 10
            AND p.quantity > 0
            ORDER BY p.quantity ASC
        `);

        const totalAlerts = urgentProducts.length + lowStockProducts.length;
        
        if (totalAlerts === 0) {
            console.log('✅ No urgent alerts found for immediate notification.');
            return { 
                success: true, 
                message: 'No urgent alerts found',
                type: 'immediate',
                details: {
                    urgent_products: 0,
                    low_stock_products: 0,
                    users_notified: 0
                }
            };
        }

        console.log(`🚨 Found ${urgentProducts.length} urgent products and ${lowStockProducts.length} low stock products`);

        // Send immediate notifications to each user
        const notificationResults = [];
        for (const user of users) {
            // Filter products for this specific user
            const userUrgentProducts = urgentProducts.filter(p => !userId || p.user_id === user.id);
            const userLowStockProducts = lowStockProducts.filter(p => !userId || p.user_id === user.id);
            
            if (userUrgentProducts.length > 0 || userLowStockProducts.length > 0) {
                const emailSent = await sendImmediateAlertEmail(user, userUrgentProducts, userLowStockProducts);
                
                // Also send real-time notification if user is connected
                if (userUrgentProducts.length > 0) {
                    userUrgentProducts.forEach(product => {
                        realTimeNotifier.sendExpiryAlert(product, user);
                    });
                }
                
                if (userLowStockProducts.length > 0) {
                    userLowStockProducts.forEach(product => {
                        realTimeNotifier.sendLowStockAlert(product, user);
                    });
                }

                notificationResults.push({
                    user: user.username,
                    email: user.email,
                    urgent_products: userUrgentProducts.length,
                    low_stock_products: userLowStockProducts.length,
                    email_sent: emailSent,
                    realtime_sent: true
                });
            }
        }

        console.log('✅ IMMEDIATE notification process completed');
        return { 
            success: true, 
            message: `Immediate notifications sent to ${notificationResults.length} users`,
            type: 'immediate',
            summary: {
                total_alerts: totalAlerts,
                urgent_alerts: urgentProducts.length,
                low_stock_alerts: lowStockProducts.length,
                users_notified: notificationResults.length
            },
            details: notificationResults
        };

    } catch (error) {
        console.error('❌ Immediate notification error:', error);
        return { 
            success: false, 
            message: error.message,
            type: 'immediate'
        };
    }
};

// 🔔 SCHEDULED NOTIFICATION FUNCTION (Daily at 9 AM)
exports.sendExpiryNotifications = async () => {
    try {
        console.log('🕘 Starting SCHEDULED expiry notifications check...');
        
        // Get admin users with valid emails
        const adminUsers = await getAdminUsersWithEmail();
        
        if (adminUsers.length === 0) {
            console.log('❌ No admin users with valid email addresses found.');
            return { 
                success: false, 
                message: 'No admin users with valid email addresses',
                type: 'scheduled'
            };
        }

        console.log(`👥 Found ${adminUsers.length} admin users with emails:`);
        adminUsers.forEach(admin => {
            console.log(`   - ${admin.username} (${admin.email})`);
        });

        // Get expiring products (within 30 days)
        const [expiringProducts] = await db.query(`
            SELECT p.id, p.name, p.batch_no, p.expiry_date, p.quantity,
                   DATEDIFF(p.expiry_date, CURDATE()) as days_until_expiry
            FROM SE_products p 
            WHERE p.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
            AND p.quantity > 0
            ORDER BY p.expiry_date ASC
        `);
        
        if (expiringProducts.length === 0) {
            console.log('✅ No products expiring soon.');
            return { 
                success: true, 
                message: 'No products expiring soon',
                type: 'scheduled'
            };
        }

        console.log(`📦 Found ${expiringProducts.length} products expiring soon`);

        // Send notifications to each admin
        const emailResults = [];
        for (const admin of adminUsers) {
            if (admin.email) {
                const emailSent = await sendExpiryEmailToAdmin(admin, expiringProducts);
                emailResults.push({
                    admin: admin.username,
                    email: admin.email,
                    success: emailSent
                });
            }
        }

        console.log('✅ SCHEDULED notification process completed');
        return { 
            success: true, 
            message: `Scheduled notifications processed for ${adminUsers.length} admins`,
            type: 'scheduled',
            details: {
                admins: adminUsers.length,
                products: expiringProducts.length,
                emails_sent: emailResults.filter(r => r.success).length,
                emails_failed: emailResults.filter(r => !r.success).length
            }
        };

    } catch (error) {
        console.error('❌ Scheduled notification error:', error);
        return { 
            success: false, 
            message: error.message,
            type: 'scheduled'
        };
    }
};

// Send immediate alert email
async function sendImmediateAlertEmail(user, urgentProducts, lowStockProducts) {
    try {
        const transporter = createEmailTransporter();
        if (!transporter) {
            console.log(`❌ Email transporter not configured for ${user.email}`);
            return false;
        }

        const emailContent = generateImmediateAlertEmailContent(user, urgentProducts, lowStockProducts);
        
        const mailOptions = {
            from: {
                name: 'SmartExpiry System',
                address: process.env.EMAIL_USER
            },
            to: user.email,
            subject: `🚨 IMMEDIATE ACTION: ${urgentProducts.length} Urgent & ${lowStockProducts.length} Low Stock Alerts - SmartExpiry`,
            html: emailContent,
            text: generateImmediatePlainTextEmail(user, urgentProducts, lowStockProducts)
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Immediate alert email sent to: ${user.email}`);
        return true;

    } catch (error) {
        console.error(`❌ Failed to send immediate email to ${user.email}:`, error.message);
        return false;
    }
}

// Generate immediate alert email content
function generateImmediateAlertEmailContent(user, urgentProducts, lowStockProducts) {
    let urgentTable = '';
    let lowStockTable = '';
    
    // Urgent products table (expiring in 7 days)
    urgentProducts.forEach((product, index) => {
        const daysLeft = product.days_until_expiry;
        const urgencyColor = daysLeft <= 3 ? '#FF0000' : '#FFA500';
        
        urgentTable += `
            <tr>
                <td style="padding: 10px; border: 1px solid #dddddd; text-align: center;">${index + 1}</td>
                <td style="padding: 10px; border: 1px solid #dddddd;">${product.name}</td>
                <td style="padding: 10px; border: 1px solid #dddddd; text-align: center;">${product.batch_no || 'N/A'}</td>
                <td style="padding: 10px; border: 1px solid #dddddd; text-align: center;">${product.quantity}</td>
                <td style="padding: 10px; border: 1px solid #dddddd; text-align: center;">${new Date(product.expiry_date).toLocaleDateString()}</td>
                <td style="padding: 10px; border: 1px solid #dddddd; text-align: center; color: ${urgencyColor}; font-weight: bold;">
                    ${daysLeft} days<br><small>${daysLeft <= 3 ? 'CRITICAL' : 'URGENT'}</small>
                </td>
            </tr>
        `;
    });

    // Low stock products table
    lowStockProducts.forEach((product, index) => {
        const stockLevel = product.quantity;
        const stockColor = stockLevel <= 3 ? '#FF0000' : stockLevel <= 5 ? '#FFA500' : '#FFD700';
        
        lowStockTable += `
            <tr>
                <td style="padding: 10px; border: 1px solid #dddddd; text-align: center;">${index + 1}</td>
                <td style="padding: 10px; border: 1px solid #dddddd;">${product.name}</td>
                <td style="padding: 10px; border: 1px solid #dddddd; text-align: center;">${product.batch_no || 'N/A'}</td>
                <td style="padding: 10px; border: 1px solid #dddddd; text-align: center; color: ${stockColor}; font-weight: bold;">${product.quantity}</td>
                <td style="padding: 10px; border: 1px solid #dddddd; text-align: center;">${new Date(product.expiry_date).toLocaleDateString()}</td>
                <td style="padding: 10px; border: 1px solid #dddddd; text-align: center;">
                    ${stockLevel <= 3 ? 'CRITICAL' : stockLevel <= 5 ? 'LOW' : 'WARNING'}
                </td>
            </tr>
        `;
    });

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>IMMEDIATE ACTION REQUIRED</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
            <div style="max-width: 800px; margin: 0 auto; background: #ffffff;">
                <!-- Header -->
                <div style="background: #e74c3c; color: white; padding: 25px; text-align: center;">
                    <h1 style="margin: 0; font-size: 28px;">🚨 IMMEDIATE ACTION REQUIRED</h1>
                    <p style="margin: 10px 0 0 0; font-size: 16px;">Urgent Inventory Alerts - SmartExpiry</p>
                </div>
                
                <!-- Content -->
                <div style="padding: 25px; background: #fff3f3;">
                    <h2 style="color: #e74c3c; margin-top: 0;">Hello ${user.username},</h2>
                    
                    <div style="background: #e74c3c; color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin: 0; font-size: 20px;">⚠️ CRITICAL ALERTS REQUIRING IMMEDIATE ATTENTION</h3>
                        <p style="margin: 10px 0 0 0; font-size: 16px;">
                            You have <strong>${urgentProducts.length} urgent expiry alerts</strong> and 
                            <strong> ${lowStockProducts.length} low stock alerts</strong> that need immediate action.
                        </p>
                    </div>

                    ${urgentProducts.length > 0 ? `
                    <!-- Urgent Products Table -->
                    <h3 style="color: #e74c3c; border-bottom: 2px solid #e74c3c; padding-bottom: 10px;">🕐 URGENT EXPIRY ALERTS (Within 7 Days)</h3>
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: white; border: 2px solid #e74c3c;">
                        <thead>
                            <tr>
                                <th style="background: #e74c3c; color: white; padding: 12px; text-align: left;">#</th>
                                <th style="background: #e74c3c; color: white; padding: 12px; text-align: left;">Product Name</th>
                                <th style="background: #e74c3c; color: white; padding: 12px; text-align: left;">Batch No</th>
                                <th style="background: #e74c3c; color: white; padding: 12px; text-align: left;">Quantity</th>
                                <th style="background: #e74c3c; color: white; padding: 12px; text-align: left;">Expiry Date</th>
                                <th style="background: #e74c3c; color: white; padding: 12px; text-align: left;">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${urgentTable}
                        </tbody>
                    </table>
                    ` : ''}

                    ${lowStockProducts.length > 0 ? `
                    <!-- Low Stock Products Table -->
                    <h3 style="color: #e67e22; border-bottom: 2px solid #e67e22; padding-bottom: 10px;">📦 LOW STOCK ALERTS</h3>
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: white; border: 2px solid #e67e22;">
                        <thead>
                            <tr>
                                <th style="background: #e67e22; color: white; padding: 12px; text-align: left;">#</th>
                                <th style="background: #e67e22; color: white; padding: 12px; text-align: left;">Product Name</th>
                                <th style="background: #e67e22; color: white; padding: 12px; text-align: left;">Batch No</th>
                                <th style="background: #e67e22; color: white; padding: 12px; text-align: left;">Quantity</th>
                                <th style="background: #e67e22; color: white; padding: 12px; text-align: left;">Expiry Date</th>
                                <th style="background: #e67e22; color: white; padding: 12px; text-align: left;">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${lowStockTable}
                        </tbody>
                    </table>
                    ` : ''}

                    <!-- Immediate Actions -->
                    <div style="background: #fff3cd; border: 2px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 25px 0;">
                        <h3 style="color: #856404; margin-top: 0;">🎯 RECOMMENDED IMMEDIATE ACTIONS:</h3>
                        <ul style="color: #856404; padding-left: 20px;">
                            <li><strong>Review all urgent products</strong> and prioritize actions</li>
                            <li><strong>Implement immediate sales strategies</strong> for expiring products</li>
                            <li><strong>Place restock orders</strong> for low inventory items</li>
                            <li><strong>Contact suppliers</strong> for urgent deliveries</li>
                            <li><strong>Update inventory records</strong> after taking actions</li>
                        </ul>
                    </div>

                    <!-- Dashboard Button -->
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" 
                           style="background: #e74c3c; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">
                            🚀 Take Action Now
                        </a>
                    </div>
                </div>
                
                <!-- Footer -->
                <div style="background: #2c3e50; padding: 20px; text-align: center; color: #ecf0f1; font-size: 12px;">
                    <p style="margin: 0 0 10px 0;"><strong>SmartExpiry System - Immediate Alert</strong></p>
                    <p style="margin: 5px 0;">This is an URGENT automated alert message requiring immediate attention.</p>
                </div>
            </div>
        </body>
        </html>
    `;
}

// Generate plain text for immediate alerts
function generateImmediatePlainTextEmail(user, urgentProducts, lowStockProducts) {
    let text = `🚨 IMMEDIATE ACTION REQUIRED - URGENT INVENTORY ALERTS\n\n`;
    text += `Hello ${user.username},\n\n`;
    text += `CRITICAL ALERTS REQUIRING IMMEDIATE ATTENTION:\n`;
    text += `- ${urgentProducts.length} urgent expiry alerts (within 7 days)\n`;
    text += `- ${lowStockProducts.length} low stock alerts\n\n`;
    
    if (urgentProducts.length > 0) {
        text += `URGENT EXPIRY ALERTS:\n`;
        urgentProducts.forEach((product, index) => {
            text += `${index + 1}. ${product.name} | Batch: ${product.batch_no || 'N/A'} | `;
            text += `Qty: ${product.quantity} | Expiry: ${new Date(product.expiry_date).toLocaleDateString()} | `;
            text += `Days Left: ${product.days_until_expiry} (${product.days_until_expiry <= 3 ? 'CRITICAL' : 'URGENT'})\n`;
        });
        text += `\n`;
    }
    
    if (lowStockProducts.length > 0) {
        text += `LOW STOCK ALERTS:\n`;
        lowStockProducts.forEach((product, index) => {
            text += `${index + 1}. ${product.name} | Batch: ${product.batch_no || 'N/A'} | `;
            text += `Qty: ${product.quantity} | Expiry: ${new Date(product.expiry_date).toLocaleDateString()} | `;
            text += `Status: ${product.quantity <= 3 ? 'CRITICAL' : product.quantity <= 5 ? 'LOW' : 'WARNING'}\n`;
        });
        text += `\n`;
    }
    
    text += `IMMEDIATE ACTIONS REQUIRED:\n`;
    text += `- Review all urgent products and prioritize actions\n`;
    text += `- Implement immediate sales strategies for expiring products\n`;
    text += `- Place restock orders for low inventory items\n`;
    text += `- Contact suppliers for urgent deliveries\n`;
    text += `- Update inventory records after taking actions\n\n`;
    text += `Please login to your dashboard immediately to address these alerts.\n\n`;
    text += `SmartExpiry System - Urgent Alert\n`;
    text += `This message requires immediate attention.\n`;
    
    return text;
}

// Enhanced email sending function for scheduled notifications
async function sendExpiryEmailToAdmin(admin, products) {
    try {
        const transporter = createEmailTransporter();
        if (!transporter) {
            console.log(`❌ Email transporter not configured for ${admin.email}`);
            return false;
        }

        const emailContent = generateExpiryEmailContent(admin, products);
        
        const mailOptions = {
            from: {
                name: 'SmartExpiry System',
                address: process.env.EMAIL_USER
            },
            to: admin.email,
            subject: `📅 Daily Expiry Alert: ${products.length} Product(s) Expiring Soon - SmartExpiry`,
            html: emailContent,
            text: generatePlainTextEmail(admin, products)
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Scheduled email sent successfully to: ${admin.email}`);
        return true;

    } catch (error) {
        console.error(`❌ Failed to send scheduled email to ${admin.email}:`, error.message);
        return false;
    }
}

// Generate email content for scheduled notifications
function generateExpiryEmailContent(admin, products) {
    let productsTable = '';
    
    products.forEach((product, index) => {
        const daysLeft = product.days_until_expiry;
        const urgency = daysLeft <= 3 ? '🟥 URGENT' : daysLeft <= 7 ? '🟨 WARNING' : '🟩 ALERT';
        const urgencyColor = daysLeft <= 3 ? '#FF0000' : daysLeft <= 7 ? '#FFA500' : '#27ae60';
        
        productsTable += `
            <tr>
                <td style="padding: 10px; border: 1px solid #dddddd; text-align: center; font-family: Arial, sans-serif;">${index + 1}</td>
                <td style="padding: 10px; border: 1px solid #dddddd; font-family: Arial, sans-serif;">${product.name}</td>
                <td style="padding: 10px; border: 1px solid #dddddd; text-align: center; font-family: Arial, sans-serif;">${product.batch_no || 'N/A'}</td>
                <td style="padding: 10px; border: 1px solid #dddddd; text-align: center; font-family: Arial, sans-serif;">${product.quantity}</td>
                <td style="padding: 10px; border: 1px solid #dddddd; text-align: center; font-family: Arial, sans-serif;">${new Date(product.expiry_date).toLocaleDateString()}</td>
                <td style="padding: 10px; border: 1px solid #dddddd; text-align: center; color: ${urgencyColor}; font-weight: bold; font-family: Arial, sans-serif;">
                    ${daysLeft} days<br><small>${urgency}</small>
                </td>
            </tr>
        `;
    });

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Daily Expiry Alert</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
            <div style="max-width: 800px; margin: 0 auto; background: #ffffff;">
                <!-- Header -->
                <div style="background: #3498db; color: white; padding: 25px; text-align: center;">
                    <h1 style="margin: 0; font-size: 28px;">📅 Daily Expiry Alert</h1>
                    <p style="margin: 10px 0 0 0; font-size: 16px;">SmartExpiry Inventory Management System</p>
                </div>
                
                <!-- Content -->
                <div style="padding: 25px; background: #f9f9f9;">
                    <h2 style="color: #2c3e50; margin-top: 0;">Hello ${admin.username},</h2>
                    
                    <p style="font-size: 16px;"><strong>Daily Report:</strong> You have <strong style="color: #3498db;">${products.length} product(s)</strong> that are expiring in the next 30 days.</p>
                    
                    <!-- Info Box -->
                    <div style="background: #d6eaf8; border: 2px solid #3498db; border-radius: 8px; padding: 20px; margin: 20px 0;">
                        <h3 style="color: #2c3e50; margin: 0 0 10px 0;">📊 Daily Inventory Summary</h3>
                        <p style="color: #2c3e50; margin: 0;">This is your scheduled daily expiry alert. Please review and plan accordingly.</p>
                    </div>

                    <!-- Products Table -->
                    <table style="width: 100%; border-collapse: collapse; margin: 25px 0; background: white; border: 2px solid #34495e;">
                        <thead>
                            <tr>
                                <th style="background: #34495e; color: white; padding: 12px; text-align: left; border: 1px solid #2c3e50;">#</th>
                                <th style="background: #34495e; color: white; padding: 12px; text-align: left; border: 1px solid #2c3e50;">Product Name</th>
                                <th style="background: #34495e; color: white; padding: 12px; text-align: left; border: 1px solid #2c3e50;">Batch No</th>
                                <th style="background: #34495e; color: white; padding: 12px; text-align: left; border: 1px solid #2c3e50;">Quantity</th>
                                <th style="background: #34495e; color: white; padding: 12px; text-align: left; border: 1px solid #2c3e50;">Expiry Date</th>
                                <th style="background: #34495e; color: white; padding: 12px; text-align: left; border: 1px solid #2c3e50;">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${productsTable}
                        </tbody>
                    </table>

                    <!-- Recommended Actions -->
                    <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
                        <h3 style="color: #2c3e50; margin-top: 0;">📋 Recommended Actions:</h3>
                        <ul style="padding-left: 20px;">
                            <li style="margin-bottom: 8px;"><strong>Review Inventory:</strong> Check current stock levels and sales data</li>
                            <li style="margin-bottom: 8px;"><strong>Sales Strategy:</strong> Consider implementing promotions or discounts</li>
                            <li style="margin-bottom: 8px;"><strong>Disposal Plan:</strong> Plan for proper disposal if products cannot be sold</li>
                            <li style="margin-bottom: 8px;"><strong>Procurement:</strong> Adjust future ordering quantities to avoid overstocking</li>
                        </ul>
                    </div>

                    <!-- Dashboard Button -->
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" 
                           style="background: #3498db; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">
                            📊 View Dashboard
                        </a>
                    </div>
                </div>
                
                <!-- Footer -->
                <div style="background: #ecf0f1; padding: 20px; text-align: center; color: #7f8c8d; font-size: 12px;">
                    <p style="margin: 0 0 10px 0;"><strong>SmartExpiry System - Daily Report</strong></p>
                    <p style="margin: 5px 0;">This is your scheduled daily alert message.</p>
                    <p style="margin: 5px 0;">© ${new Date().getFullYear()} SmartExpiry. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `;
}

// Generate plain text email for scheduled notifications
function generatePlainTextEmail(admin, products) {
    let text = `DAILY EXPIRY ALERT\n\n`;
    text += `Hello ${admin.username},\n\n`;
    text += `You have ${products.length} product(s) expiring soon:\n\n`;
    
    products.forEach((product, index) => {
        const daysLeft = product.days_until_expiry;
        const urgency = daysLeft <= 3 ? 'URGENT' : daysLeft <= 7 ? 'WARNING' : 'ALERT';
        
        text += `${index + 1}. ${product.name}\n`;
        text += `   Batch: ${product.batch_no || 'N/A'}\n`;
        text += `   Quantity: ${product.quantity}\n`;
        text += `   Expiry: ${new Date(product.expiry_date).toLocaleDateString()}\n`;
        text += `   Days Left: ${daysLeft} (${urgency})\n\n`;
    });
    
    text += `RECOMMENDED ACTIONS:\n`;
    text += `- Review inventory levels\n`;
    text += `- Consider promotions or discounts\n`;
    text += `- Plan for disposal if needed\n`;
    text += `- Adjust future ordering quantities\n\n`;
    text += `Please login to your dashboard for more details.\n\n`;
    text += `SmartExpiry System - Daily Alert\n`;
    text += `This is an automated daily message.\n`;
    
    return text;
}

// 🔔 MANUAL NOTIFICATION TRIGGERS

// Manual immediate notification trigger
exports.sendManualImmediateNotification = async (req, res) => {
    try {
        console.log('🔔 Manual IMMEDIATE notification trigger called');
        const userId = req.user?.id; // Get current user ID if available
        const result = await exports.sendImmediateNotifications(userId);
        res.json(result);
    } catch (error) {
        console.error('❌ Manual immediate notification failed:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Immediate notification failed',
            error: error.message,
            type: 'immediate'
        });
    }
};

// Manual scheduled notification trigger
exports.sendManualScheduledNotification = async (req, res) => {
    try {
        console.log('🔔 Manual SCHEDULED notification trigger called');
        const result = await exports.sendExpiryNotifications();
        res.json(result);
    } catch (error) {
        console.error('❌ Manual scheduled notification failed:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Scheduled notification failed',
            error: error.message,
            type: 'scheduled'
        });
    }
};

// Test notification function
exports.sendTestNotification = async (req, res) => {
    try {
        console.log('🧪 Test notification trigger called');
        
        // Create a test product
        const testProduct = {
            id: 999,
            name: 'Test Product - Paracetamol',
            batch_no: 'TEST-001',
            expiry_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days from now
            quantity: 2,
            days_until_expiry: 3
        };

        const testUser = {
            id: req.user?.id || 1,
            username: req.user?.username || 'Test User',
            email: process.env.EMAIL_USER,
            role_id: 1
        };

        // Send test real-time notification
        const realtimeResult = await realTimeNotifier.sendExpiryAlert(testProduct, testUser);
        
        // Send test email
        const transporter = createEmailTransporter();
        if (transporter) {
            const testMailOptions = {
                from: {
                    name: 'SmartExpiry System',
                    address: process.env.EMAIL_USER
                },
                to: process.env.EMAIL_USER,
                subject: '✅ Test Notification - SmartExpiry',
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px;">
                        <h2 style="color: #27ae60;">✅ Test Notification Successful!</h2>
                        <p>Your SmartExpiry notification system is working correctly.</p>
                        <p><strong>Test Time:</strong> ${new Date().toString()}</p>
                        <p><strong>Notification Type:</strong> Immediate & Scheduled Test</p>
                        <p><strong>Real-time Notification:</strong> ${realtimeResult.success ? '✅ Sent' : '❌ Failed'}</p>
                        <p>All notification channels are operational.</p>
                    </div>
                `
            };

            await transporter.sendMail(testMailOptions);
        }

        res.json({
            success: true,
            message: 'Test notification sent successfully',
            type: 'test',
            details: {
                realtime_sent: realtimeResult.success,
                email_sent: !!transporter,
                test_product: testProduct.name,
                test_user: testUser.username
            }
        });

    } catch (error) {
        console.error('❌ Test notification failed:', error);
        res.status(500).json({
            success: false,
            message: 'Test notification failed',
            error: error.message,
            type: 'test'
        });
    }
};

// Quick check function
exports.quickInventoryCheck = async (req, res) => {
    try {
        console.log('⚡ Quick inventory check triggered');
        
        // Get urgent counts
        const [urgentCount] = await db.query(`
            SELECT COUNT(*) as count 
            FROM SE_products 
            WHERE expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
            AND quantity > 0
        `);

        const [lowStockCount] = await db.query(`
            SELECT COUNT(*) as count 
            FROM SE_products 
            WHERE quantity < 10 
            AND quantity > 0
        `);

        res.json({
            success: true,
            message: 'Quick inventory check completed',
            type: 'quick_check',
            summary: {
                urgent_expiry_alerts: urgentCount[0].count,
                low_stock_alerts: lowStockCount[0].count,
                total_alerts: urgentCount[0].count + lowStockCount[0].count,
                check_time: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Quick check failed:', error);
        res.status(500).json({
            success: false,
            message: 'Quick check failed',
            error: error.message,
            type: 'quick_check'
        });
    }
};

// Legacy function for compatibility
exports.sendManualNotification = exports.sendManualScheduledNotification;

// Test email function
exports.testEmail = async (req, res) => {
    try {
        console.log('🧪 Testing email configuration...');
        
        const transporter = createEmailTransporter();
        if (!transporter) {
            return res.status(500).json({
                success: false,
                message: 'Email transporter not configured'
            });
        }

        // Test email to yourself
        const testMailOptions = {
            from: {
                name: 'SmartExpiry System',
                address: process.env.EMAIL_USER
            },
            to: process.env.EMAIL_USER,
            subject: '✅ SmartExpiry - Test Email Configuration',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2 style="color: #27ae60;">✅ Email Test Successful!</h2>
                    <p>Your SmartExpiry email configuration is working correctly.</p>
                    <p><strong>Server Time:</strong> ${new Date().toString()}</p>
                    <p><strong>Email Service:</strong> ${process.env.EMAIL_HOST || 'smtp.gmail.com'}</p>
                    <p>You will receive expiry notifications at this email address.</p>
                </div>
            `
        };

        await transporter.sendMail(testMailOptions);
        console.log('✅ Test email sent successfully');

        res.json({
            success: true,
            message: 'Test email sent successfully',
            recipient: process.env.EMAIL_USER
        });

    } catch (error) {
        console.error('❌ Test email failed:', error);
        res.status(500).json({
            success: false,
            message: 'Test email failed',
            error: error.message
        });
    }
};

exports.checkExpiryAndSendAlerts = exports.sendExpiryNotifications;