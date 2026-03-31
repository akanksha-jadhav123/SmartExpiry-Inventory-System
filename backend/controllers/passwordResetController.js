const db = require('../db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Enhanced email transporter with better error handling
function createTransporter() {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.error('❌ Email credentials missing in environment variables');
            console.log('   Please check your .env file has EMAIL_USER and EMAIL_PASS');
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
        console.error('❌ Email transporter creation failed:', error.message);
        return null;
    }
}

exports.forgotPassword = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ 
            success: false, 
            message: 'Email is required' 
        });
    }

    try {
        console.log('🔐 Forgot password request for:', email);

        // Check if user exists
        const [users] = await db.query(
            'SELECT id, username, email FROM users WHERE email = ?', 
            [email]
        );

        // Don't reveal if email exists or not for security
        if (users.length === 0) {
            console.log('📧 Email not found (security measure)');
            return res.json({ 
                success: true, 
                message: 'If the email exists, a reset link will be sent' 
            });
        }

        const user = users[0];

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

        // Delete any existing reset tokens for this user
        await db.query(
            'DELETE FROM password_resets WHERE user_id = ?', 
            [user.id]
        );

        // Save reset token to database
        await db.query(
            'INSERT INTO password_resets (user_id, reset_token, expires_at) VALUES (?, ?, ?)',
            [user.id, resetToken, expiresAt]
        );

        // Send reset email
        await sendResetEmail(user.email, user.username, resetToken);

        console.log('✅ Password reset token created for:', user.email);

        res.json({
            success: true,
            message: 'If the email exists, a reset link will be sent'
        });

    } catch (error) {
        console.error('❌ Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing password reset request'
        });
    }
};

exports.resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return res.status(400).json({
            success: false,
            message: 'Token and new password are required'
        });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({
            success: false,
            message: 'Password must be at least 6 characters long'
        });
    }

    try {
        console.log('🔄 Processing password reset with token');

        // Find valid reset token
        const [resetRecords] = await db.query(`
            SELECT pr.*, u.email, u.username 
            FROM password_resets pr 
            JOIN users u ON pr.user_id = u.id 
            WHERE pr.reset_token = ? 
            AND pr.expires_at > NOW() 
            AND pr.used = FALSE
        `, [token]);

        if (resetRecords.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token'
            });
        }

        const resetRecord = resetRecords[0];

        // Hash new password
        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(newPassword, salt);

        // Update user password
        await db.query(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, resetRecord.user_id]
        );

        // Mark token as used
        await db.query(
            'UPDATE password_resets SET used = TRUE WHERE id = ?',
            [resetRecord.id]
        );

        // Send confirmation email
        await sendPasswordChangedEmail(resetRecord.email, resetRecord.username);

        console.log('✅ Password reset successful for:', resetRecord.email);

        res.json({
            success: true,
            message: 'Password has been reset successfully'
        });

    } catch (error) {
        console.error('❌ Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Error resetting password'
        });
    }
};

exports.validateResetToken = async (req, res) => {
    const { token } = req.params;

    try {
        const [resetRecords] = await db.query(`
            SELECT pr.*, u.email 
            FROM password_resets pr 
            JOIN users u ON pr.user_id = u.id 
            WHERE pr.reset_token = ? 
            AND pr.expires_at > NOW() 
            AND pr.used = FALSE
        `, [token]);

        if (resetRecords.length === 0) {
            return res.status(400).json({
                success: false,
                valid: false,
                message: 'Invalid or expired reset token'
            });
        }

        res.json({
            success: true,
            valid: true,
            message: 'Token is valid'
        });

    } catch (error) {
        console.error('❌ Token validation error:', error);
        res.status(500).json({
            success: false,
            valid: false,
            message: 'Error validating token'
        });
    }
};

// Send password reset email
async function sendResetEmail(email, username, resetToken) {
    try {
        const transporter = createTransporter();
        if (!transporter) {
            throw new Error('Email service not configured');
        }

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

        const mailOptions = {
            from: {
                name: 'SmartExpiry System',
                address: process.env.EMAIL_USER
            },
            to: email,
            subject: '🔐 Password Reset Request - SmartExpiry System',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #3498db; color: white; padding: 30px; text-align: center;">
                        <h1 style="margin: 0;">Password Reset Request</h1>
                    </div>
                    
                    <div style="padding: 30px; background: white; border: 1px solid #ddd;">
                        <p>Hello <strong>${username}</strong>,</p>
                        
                        <p>We received a request to reset your password for your SmartExpiry System account.</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetLink}" 
                               style="background-color: #e74c3c; color: white; padding: 15px 30px; 
                                      text-decoration: none; border-radius: 5px; display: inline-block;
                                      font-size: 16px; font-weight: bold;">
                                Reset Your Password
                            </a>
                        </div>
                        
                        <p style="color: #e74c3c; font-weight: bold;">
                            ⚠️ This link will expire in 1 hour.
                        </p>
                        
                        <p>If you didn't request this reset, please ignore this email.</p>
                        
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                            <p style="color: #666; font-size: 12px;">
                                If the button doesn't work, copy and paste this link:<br>
                                <code style="background: #f8f9fa; padding: 8px; border-radius: 3px;">${resetLink}</code>
                            </p>
                        </div>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('✅ Reset email sent to:', email);

    } catch (error) {
        console.error('❌ Failed to send reset email:', error.message);
        throw new Error('Failed to send reset email');
    }
}

// Send password changed confirmation email
async function sendPasswordChangedEmail(email, username) {
    try {
        const transporter = createTransporter();
        if (!transporter) {
            console.log('⚠️ Email service not configured - skipping confirmation email');
            return;
        }

        const mailOptions = {
            from: {
                name: 'SmartExpiry System',
                address: process.env.EMAIL_USER
            },
            to: email,
            subject: '✅ Password Changed Successfully - SmartExpiry System',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #27ae60; color: white; padding: 30px; text-align: center;">
                        <h1 style="margin: 0;">Password Changed Successfully</h1>
                    </div>
                    
                    <div style="padding: 30px; background: white; border: 1px solid #ddd;">
                        <p>Hello <strong>${username}</strong>,</p>
                        
                        <p>Your password has been successfully changed.</p>
                        
                        <div style="background: #d4edda; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0;">
                            <strong>✅ Password Update Complete</strong>
                        </div>
                        
                        <p>If you did not make this change, please contact support immediately.</p>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('✅ Password changed email sent to:', email);

    } catch (error) {
        console.error('❌ Failed to send confirmation email:', error.message);
    }
}