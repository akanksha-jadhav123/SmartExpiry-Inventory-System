
const db = require('../db');
const nodemailer = require('nodemailer');
const axios = require('axios'); // For potential WhatsApp API

class RealTimeNotifier {
    constructor() {
        this.connectedUsers = new Map();
        this.setupEmailTransporter();
        this.setupSMSService();
        this.setupWhatsAppService();
        
        console.log('🔔 RealTimeNotifier initialized');
        console.log('📧 Email service:', this.emailTransporter ? 'Ready' : 'Not configured');
        console.log('📱 SMS service:', this.twilioClient ? 'Ready' : 'Not configured');
        console.log('💬 WhatsApp service:', this.whatsappEnabled ? 'Ready' : 'Not configured');
    }

    // Set Socket.io instance
    setIO(io) {
        this.io = io;
        console.log('🔌 Socket.IO instance set for real-time notifications');
    }

// Email Setup with better error handling
setupEmailTransporter() {
    try {
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            console.log('📧 Configuring email service...');
            console.log('   Email:', process.env.EMAIL_USER);
            console.log('   Password:', '***' + process.env.EMAIL_PASS.slice(-3));
            
            this.emailTransporter = nodemailer.createTransport({
                host: process.env.EMAIL_HOST || 'smtp.gmail.com',
                port: process.env.EMAIL_PORT || 587,
                secure: false,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS,
                },
            });
            
            this.emailTransporter.verify((error, success) => {
                if (error) {
                    console.log('❌ Email configuration error:');
                    console.log('   Error:', error.message);
                    
                    if (error.code === 'EAUTH') {
                        console.log('   🔧 Solution:');
                        console.log('   1. Check if email and password are correct');
                        console.log('   2. Make sure you\'re using App Password, not regular password');
                        console.log('   3. Enable 2-factor authentication in Google Account');
                        console.log('   4. Generate App Password at: https://myaccount.google.com/apppasswords');
                    }
                    
                    this.emailTransporter = null;
                } else {
                    console.log('✅ Email service configured successfully');
                    console.log('   Ready to send notifications via email');
                }
            });
        } else {
            console.log('📧 Email service not configured:');
            console.log('   Missing EMAIL_USER or EMAIL_PASS in .env file');
            this.emailTransporter = null;
        }
    } catch (error) {
        console.error('❌ Email setup failed:', error.message);
        this.emailTransporter = null;
    }
}
    // SMS Setup (Twilio) - Graceful handling
    setupSMSService() {
        try {
            const accountSid = process.env.TWILIO_ACCOUNT_SID;
            const authToken = process.env.TWILIO_AUTH_TOKEN;
            
            if (accountSid && authToken) {
                // Validate account SID format
                if (!accountSid.startsWith('AC')) {
                    throw new Error('Invalid Twilio Account SID format. Must start with "AC"');
                }
                
                // Import twilio only if credentials are valid
                const twilio = require('twilio');
                this.twilioClient = twilio(accountSid, authToken);
                console.log('✅ SMS service (Twilio) configured successfully');
            } else {
                console.log('📱 SMS service not configured - missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN');
                this.twilioClient = null;
            }
        } catch (error) {
            console.error('❌ SMS setup failed:', error.message);
            this.twilioClient = null;
        }
    }

    // WhatsApp Setup - Simple implementation without Twilio
    setupWhatsAppService() {
        try {
            // Simple WhatsApp implementation using email-to-SMS gateways
            // You can replace this with a proper WhatsApp Business API later
            this.whatsappEnabled = false; // Disable for now
            
            // Common email-to-WhatsApp gateways (carrier specific)
            this.whatsappGateways = {
                'india': {
                    'airtel': 'number@airtelkk.com',
                    'vodafone': 'number@vodaidea.com', 
                    'idea': 'number@ideacellular.net',
                    'bsnl': 'number@bsnl.in'
                }
            };
            
            console.log('💬 WhatsApp service: Basic setup (requires proper Business API for full features)');
            
        } catch (error) {
            console.error('❌ WhatsApp setup failed:', error.message);
            this.whatsappEnabled = false;
        }
    }

    // Register user connection
    registerUser(userId, socketId) {
        this.connectedUsers.set(userId.toString(), socketId);
        console.log(`👤 User ${userId} registered for real-time notifications`);
    }

    // Remove user connection
    unregisterUser(userId) {
        this.connectedUsers.delete(userId.toString());
        console.log(`👤 User ${userId} unregistered from real-time notifications`);
    }

    // Send multi-channel notification
    async sendMultiChannelNotification(userId, notification) {
        try {
            // 1. Get user preferences and contact info
            const userSettings = await this.getUserNotificationSettings(userId);
            
            if (!userSettings) {
                console.log(`❌ No notification settings found for user ${userId}`);
                return { success: false, error: 'User settings not found' };
            }

            const results = {
                realtime: false,
                email: false,
                sms: false,
                whatsapp: false
            };

            // 2. Real-time in-app notification (always try)
            results.realtime = this.sendToUser(userId, notification);

            // 3. Email notification
            if (userSettings.email_alerts && userSettings.email && this.emailTransporter) {
                results.email = await this.sendEmailNotification(userSettings.email, notification);
            }

            // 4. SMS notification
            if (userSettings.sms_alerts && userSettings.phone && this.twilioClient) {
                results.sms = await this.sendSMSNotification(userSettings.phone, notification);
            }

            // 5. WhatsApp notification (basic implementation)
            if (userSettings.whatsapp_alerts && userSettings.phone && this.whatsappEnabled) {
                results.whatsapp = await this.sendWhatsAppNotification(userSettings.phone, notification);
            }

            // 6. Log the notification
            await this.logNotification(userId, notification, results);

            console.log(`📢 Multi-channel notification sent to user ${userId}:`, results);
            return { success: true, results };

        } catch (error) {
            console.error('❌ Multi-channel notification error:', error);
            return { success: false, error: error.message };
        }
    }

    // Get user notification settings
    async getUserNotificationSettings(userId) {
        try {
            const [settings] = await db.query(`
                SELECT 
                    u.email, u.phone,
                    COALESCE(uas.email_alerts, true) as email_alerts,
                    COALESCE(uas.sms_alerts, false) as sms_alerts,
                    COALESCE(uas.whatsapp_alerts, false) as whatsapp_alerts,
                    COALESCE(uas.urgent_days, 7) as urgent_days,
                    COALESCE(uas.warning_days, 30) as warning_days
                FROM users u
                LEFT JOIN user_alert_settings uas ON u.id = uas.user_id
                WHERE u.id = ?
            `, [userId]);

            return settings.length > 0 ? settings[0] : {
                email: null,
                phone: null,
                email_alerts: true,
                sms_alerts: false,
                whatsapp_alerts: false,
                urgent_days: 7,
                warning_days: 30
            };
        } catch (error) {
            console.error('Error fetching user settings:', error);
            return null;
        }
    }

    // Real-time in-app notification
    sendToUser(userId, notification) {
        const socketId = this.connectedUsers.get(userId.toString());
        
        if (socketId && this.io) {
            this.io.to(socketId).emit('notification', {
                id: Date.now(),
                ...notification,
                timestamp: new Date()
            });
            console.log(`📤 Real-time notification sent to user ${userId}`);
            return true;
        } else {
            console.log(`📵 User ${userId} is not connected - storing offline`);
            this.storeOfflineNotification(userId, notification);
            return false;
        }
    }

    // Email notification
    async sendEmailNotification(email, notification) {
        try {
            const mailOptions = {
                from: `"SmartExpiry Alerts" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: `🚨 ${notification.title} - SmartExpiry`,
                html: this.generateEmailTemplate(notification),
            };

            await this.emailTransporter.sendMail(mailOptions);
            console.log(`📧 Email sent to: ${email}`);
            return true;
        } catch (error) {
            console.error(`❌ Email failed for ${email}:`, error.message);
            return false;
        }
    }

    // SMS notification (Twilio)
    async sendSMSNotification(phone, notification) {
        try {
            if (!this.twilioClient) {
                console.log('📱 SMS not configured - Twilio client not available');
                return false;
            }

            // Format phone number if needed
            let formattedPhone = phone;
            if (!phone.startsWith('+')) {
                // Assume Indian number and add +91
                formattedPhone = `+91${phone.replace(/\D/g, '')}`;
            }

            await this.twilioClient.messages.create({
                body: `🚨 ${notification.title}: ${notification.message}`,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: formattedPhone
            });

            console.log(`📱 SMS sent to: ${formattedPhone}`);
            return true;
        } catch (error) {
            console.error(`❌ SMS failed for ${phone}:`, error.message);
            return false;
        }
    }

    // WhatsApp notification (Basic implementation)
    async sendWhatsAppNotification(phone, notification) {
        try {
            if (!this.whatsappEnabled) {
                console.log('💬 WhatsApp not configured');
                return false;
            }

            // Simple implementation using email-to-SMS gateway
            // Note: This is a basic workaround. For production, use WhatsApp Business API
            console.log(`💬 WhatsApp notification prepared for: ${phone}`);
            console.log(`Message: ${notification.title} - ${notification.message}`);
            
            // You can integrate with WhatsApp Business API here
            // For now, we'll just log it
            return true;
            
        } catch (error) {
            console.error(`❌ WhatsApp failed for ${phone}:`, error.message);
            return false;
        }
    }

    // Generate email HTML template
    generateEmailTemplate(notification) {
        const priorityColors = {
            high: '#e74c3c',
            medium: '#f39c12',
            low: '#3498db'
        };

        const color = priorityColors[notification.priority] || '#3498db';

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { 
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        margin: 0;
                        padding: 20px;
                    }
                    .container { 
                        max-width: 600px; 
                        margin: 0 auto; 
                        background: white; 
                        border-radius: 15px; 
                        overflow: hidden; 
                        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                    }
                    .header { 
                        background: ${color}; 
                        color: white; 
                        padding: 30px 20px; 
                        text-align: center;
                        position: relative;
                    }
                    .header h1 {
                        margin: 0;
                        font-size: 24px;
                        font-weight: 600;
                    }
                    .header-icon {
                        font-size: 40px;
                        margin-bottom: 10px;
                    }
                    .content { 
                        padding: 30px; 
                    }
                    .priority { 
                        display: inline-block; 
                        padding: 8px 16px; 
                        background: ${color}; 
                        color: white; 
                        border-radius: 20px; 
                        font-size: 12px; 
                        font-weight: bold;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    }
                    .alert-details {
                        background: #f8f9fa;
                        padding: 20px;
                        border-radius: 10px;
                        margin: 20px 0;
                        border-left: 4px solid ${color};
                    }
                    .alert-details p {
                        margin: 8px 0;
                        color: #555;
                    }
                    .footer { 
                        background: #f8f9fa; 
                        padding: 20px; 
                        text-align: center; 
                        color: #666; 
                        font-size: 12px;
                        border-top: 1px solid #e9ecef;
                    }
                    .button {
                        display: inline-block;
                        background: ${color};
                        color: white;
                        padding: 12px 24px;
                        text-decoration: none;
                        border-radius: 6px;
                        font-weight: 600;
                        margin-top: 15px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="header-icon">🚨</div>
                        <h1>SmartExpiry Alert</h1>
                    </div>
                    <div class="content">
                        <span class="priority">${notification.priority?.toUpperCase() || 'ALERT'}</span>
                        <h2 style="color: #2c3e50; margin-top: 20px;">${notification.title}</h2>
                        <p style="color: #555; line-height: 1.6; font-size: 16px;">${notification.message}</p>
                        
                        <div class="alert-details">
                            ${notification.productName ? `<p><strong>Product:</strong> ${notification.productName}</p>` : ''}
                            ${notification.daysUntilExpiry ? `<p><strong>Days Until Expiry:</strong> ${notification.daysUntilExpiry}</p>` : ''}
                            ${notification.currentStock ? `<p><strong>Current Stock:</strong> ${notification.currentStock}</p>` : ''}
                            ${notification.expiryDate ? `<p><strong>Expiry Date:</strong> ${new Date(notification.expiryDate).toLocaleDateString()}</p>` : ''}
                        </div>
                        
                        <p style="color: #7f8c8d; font-style: italic;">
                            This is an automated alert from your SmartExpiry Inventory System.
                        </p>
                        
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" class="button">
                            View Dashboard
                        </a>
                    </div>
                    <div class="footer">
                        <p>© ${new Date().getFullYear()} SmartExpiry System. All rights reserved.</p>
                        <p>This is an automated message, please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    // Log notification in database
    async logNotification(userId, notification, results) {
        try {
            await db.query(`
                INSERT INTO notification_logs 
                (user_id, type, title, message, channels_used, success_channels, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                userId,
                notification.type,
                notification.title,
                notification.message,
                JSON.stringify(['realtime', 'email', 'sms', 'whatsapp']),
                JSON.stringify(results),
                new Date()
            ]);
        } catch (error) {
            console.error('Error logging notification:', error);
        }
    }

    // Store for offline users
    async storeOfflineNotification(userId, notification) {
        try {
            await db.query(`
                INSERT INTO pending_notifications (user_id, type, title, message, data, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [userId, notification.type, notification.title, notification.message, 
                JSON.stringify(notification), new Date()]);
        } catch (error) {
            console.error('Error storing offline notification:', error);
        }
    }

    // Send expiry alert with multi-channel
    async sendExpiryAlert(product, currentUser) {
        const daysUntilExpiry = Math.ceil((new Date(product.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
        const isUrgent = daysUntilExpiry <= 3;
        
        const notification = {
            type: 'expiry_alert',
            title: isUrgent ? '🚨 URGENT: Product Expiring!' : '🔄 Product Expiry Alert',
            message: `${product.name} expires in ${daysUntilExpiry} days. Current stock: ${product.quantity}`,
            productId: product.id,
            productName: product.name,
            daysUntilExpiry: daysUntilExpiry,
            currentStock: product.quantity,
            expiryDate: product.expiry_date,
            priority: isUrgent ? 'high' : daysUntilExpiry <= 7 ? 'medium' : 'low',
            actionRequired: true
        };

        return await this.sendMultiChannelNotification(currentUser.id, notification);
    }

    // Send low stock alert with multi-channel
    async sendLowStockAlert(product, currentUser) {
        const isCritical = product.quantity <= 5;
        
        const notification = {
            type: 'low_stock',
            title: isCritical ? '📦 CRITICAL: Low Stock!' : '📦 Low Stock Alert',
            message: `${product.name} is running low. Only ${product.quantity} units remaining.`,
            productId: product.id,
            productName: product.name,
            currentStock: product.quantity,
            priority: isCritical ? 'high' : 'medium',
            actionRequired: true
        };

        return await this.sendMultiChannelNotification(currentUser.id, notification);
    }

    // Send billing notification
    async sendBillingNotification(bill, currentUser) {
        const notification = {
            type: 'billing',
            title: '💰 Bill Created Successfully',
            message: `Bill #${bill.id} created for ${bill.customer_name}. Total: ₹${bill.total_amount}`,
            billId: bill.id,
            totalAmount: bill.total_amount,
            customerName: bill.customer_name,
            priority: 'low'
        };

        return await this.sendMultiChannelNotification(currentUser.id, notification);
    }

    // Get pending notifications for user when they reconnect
    async getPendingNotifications(userId) {
        try {
            const [notifications] = await db.query(
                `SELECT * FROM pending_notifications 
                 WHERE user_id = ? AND delivered = FALSE 
                 ORDER BY created_at DESC LIMIT 50`,
                [userId]
            );
            
            // Mark as delivered
            await db.query(
                'UPDATE pending_notifications SET delivered = TRUE WHERE user_id = ?',
                [userId]
            );
            
            return notifications.map(notif => ({
                ...notif,
                data: JSON.parse(notif.data || '{}')
            }));
        } catch (error) {
            console.error('Error getting pending notifications:', error);
            return [];
        }
    }

    // Automated expiry check (called by cron job)
    async automatedExpiryCheck() {
        try {
            console.log('🔔 Starting automated multi-channel expiry check...');
            
            const [expiringProducts] = await db.query(`
                SELECT 
                    p.*, 
                    u.id as user_id,
                    DATEDIFF(p.expiry_date, CURDATE()) as days_until_expiry
                FROM SE_products p
                JOIN users u ON p.user_id = u.id
                WHERE p.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
                AND p.quantity > 0
                ORDER BY p.expiry_date ASC
            `);

            let notificationsSent = 0;
            
            for (const product of expiringProducts) {
                const userSettings = await this.getUserNotificationSettings(product.user_id);
                
                if (userSettings) {
                    const daysUntilExpiry = product.days_until_expiry;
                    
                    // Check if notification should be sent based on user settings
                    if (daysUntilExpiry <= userSettings.urgent_days || 
                        daysUntilExpiry <= userSettings.warning_days) {
                        
                        await this.sendExpiryAlert(product, { id: product.user_id });
                        notificationsSent++;
                    }
                }
            }

            console.log(`✅ Automated check completed. Sent ${notificationsSent} notifications`);
            return { success: true, notificationsSent };

        } catch (error) {
            console.error('❌ Automated expiry check failed:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new RealTimeNotifier();