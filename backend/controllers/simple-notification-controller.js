const db = require('../db');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Simple email transporter
const createTransporter = () => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log('❌ Email credentials not configured');
        return null;
    }

    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: process.env.EMAIL_PORT || 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
};

/**
 * Simple email notification function
 */
async function sendSimpleEmailAlert(recipientEmail, products) {
    try {
        const transporter = createTransporter();
        if (!transporter) {
            console.log('📧 Email not sent - transporter not configured');
            return false;
        }

        // Simple email content
        const subject = `🚨 ${products.length} Product(s) Expiring Soon!`;
        
        let emailContent = `
            <h2>Expiry Alert - Action Required</h2>
            <p>The following products are expiring soon:</p>
            <table border="1" style="border-collapse: collapse; width: 100%;">
                <tr style="background-color: #f8f9fa;">
                    <th style="padding: 8px;">Product Name</th>
                    <th style="padding: 8px;">Batch No</th>
                    <th style="padding: 8px;">Quantity</th>
                    <th style="padding: 8px;">Expiry Date</th>
                    <th style="padding: 8px;">Days Left</th>
                </tr>
        `;

        products.forEach(product => {
            const daysLeft = product.days_until_expiry;
            const rowColor = daysLeft <= 3 ? '#ffeaea' : daysLeft <= 7 ? '#fff4e5' : '#f8f9fa';
            
            emailContent += `
                <tr style="background-color: ${rowColor};">
                    <td style="padding: 8px;">${product.name}</td>
                    <td style="padding: 8px;">${product.batch_no || 'N/A'}</td>
                    <td style="padding: 8px;">${product.quantity}</td>
                    <td style="padding: 8px;">${new Date(product.expiry_date).toLocaleDateString()}</td>
                    <td style="padding: 8px; font-weight: bold; color: ${daysLeft <= 3 ? '#e74c3c' : '#f39c12'}">
                        ${daysLeft} days
                    </td>
                </tr>
            `;
        });

        emailContent += `
            </table>
            <br>
            <p><strong>Recommended Actions:</strong></p>
            <ul>
                <li>Review inventory levels</li>
                <li>Consider promotions or discounts</li>
                <li>Plan for disposal if needed</li>
            </ul>
            <p><em>This is an automated alert from your Expiry Inventory System</em></p>
        `;

        await transporter.sendMail({
            from: `"Expiry Alert System" <${process.env.EMAIL_USER}>`,
            to: recipientEmail,
            subject: subject,
            html: emailContent,
        });

        console.log(`✅ Email alert sent to ${recipientEmail}`);
        return true;

    } catch (error) {
        console.error(`❌ Failed to send email to ${recipientEmail}:`, error.message);
        return false;
    }
}

/**
 * Simple expiry check and alert function
 */
exports.simpleExpiryCheck = async (req, res) => {
    try {
        console.log('🔔 Starting simple expiry check...');

        // 1. Get admin users
        const [admins] = await db.query(
            `SELECT id, username, email FROM users WHERE role_id = 1`
        );

        if (admins.length === 0) {
            return res.status(200).json({ 
                success: false, 
                message: 'No admin users found to receive alerts.' 
            });
        }

        // 2. Find expiring products (within 7 days)
        const [expiringProducts] = await db.query(`
            SELECT 
                name, 
                batch_no, 
                quantity, 
                expiry_date,
                DATEDIFF(expiry_date, CURDATE()) as days_until_expiry
            FROM SE_products 
            WHERE expiry_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) 
            AND expiry_date >= CURDATE()
            ORDER BY expiry_date ASC
        `);

        if (expiringProducts.length === 0) {
            return res.status(200).json({ 
                success: true, 
                message: 'No products expiring within 7 days.' 
            });
        }

        console.log(`📦 Found ${expiringProducts.length} expiring products`);
        console.log(`👥 Sending alerts to ${admins.length} admin(s)`);

        // 3. Send email alerts
        let emailsSent = 0;
        for (const admin of admins) {
            if (admin.email) {
                const sent = await sendSimpleEmailAlert(admin.email, expiringProducts);
                if (sent) emailsSent++;
            }
        }

        // 4. Log the notification (optional)
        try {
            await db.query(
                `INSERT INTO notification_logs 
                (admin_count, product_count, emails_sent, alert_type) 
                VALUES (?, ?, ?, ?)`,
                [admins.length, expiringProducts.length, emailsSent, 'expiry_alert']
            );
        } catch (logError) {
            console.warn('Could not log notification:', logError.message);
        }

        // 5. Return response
        const result = {
            success: true,
            message: `Expiry check completed successfully!`,
            stats: {
                admins_notified: admins.length,
                products_alerted: expiringProducts.length,
                emails_sent: emailsSent
            },
            products: expiringProducts
        };

        console.log('✅ Simple expiry check completed:', result);
        
        if (req.method === 'POST') {
            res.status(200).json(result);
        }

        return result;

    } catch (error) {
        console.error('❌ Simple expiry check failed:', error);
        
        if (req.method === 'POST') {
            res.status(500).json({ 
                success: false, 
                message: 'Error during expiry check.',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
        
        throw error;
    }
};