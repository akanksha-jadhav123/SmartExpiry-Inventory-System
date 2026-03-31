const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const ADMIN_ROLE_ID = 1;
const DEFAULT_STAFF_ROLE_ID = 3;

const ROLE_MAP = {
    'Admin': ADMIN_ROLE_ID,
    'Manager': 2,
    'Staff': DEFAULT_STAFF_ROLE_ID,
    'Shopkeeper': DEFAULT_STAFF_ROLE_ID,
};

const generateToken = (id, role_id) => {
    return jwt.sign({ id, role_id }, process.env.JWT_SECRET || 'fallback_secret', {
        expiresIn: '7d',
    });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.registerUser = async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) return res.status(400).json({ message: "Missing fields" });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters long.' });

    try {
        const [existingUsers] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ message: 'User already exists with this email.' });
        }

        const hashed = bcrypt.hashSync(password, 10);
        const q = "INSERT INTO users (username, email, password, role_id) VALUES (?, ?, ?, ?)";
        const [result] = await db.query(q, [username, email, hashed, DEFAULT_STAFF_ROLE_ID]);
        
        const token = generateToken(result.insertId, DEFAULT_STAFF_ROLE_ID);
        
        res.status(201).json({ 
            id: result.insertId,
            username,
            email,
            role_id: DEFAULT_STAFF_ROLE_ID,
            token,
            message: "Registered and logged in successfully"
        });

    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") return res.status(400).json({ message: "Email already used" });
        console.error('Register Error:', error);
        res.status(500).json({ message: 'Server error during registration.' });
    }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
exports.loginUser = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Missing fields" });

    try {
        const q = "SELECT id, username, email, password, role_id, status FROM users WHERE email = ?";
        const [results] = await db.query(q, [email]);
        
        if (results.length === 0) return res.status(401).json({ message: "Invalid email or password" });

        const user = results[0];

        // Check if user is active
        if (user.status !== 'active') {
            return res.status(401).json({ message: 'Account is deactivated. Please contact administrator.' });
        }

        if (bcrypt.compareSync(password, user.password)) {
            res.json({
                id: user.id,
                username: user.username,
                email: user.email,
                role_id: user.role_id,
                status: user.status,
                token: generateToken(user.id, user.role_id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'Server error during login.' });
    }
};

// @desc    Get user profile (Current User)
// @route   GET /api/users/profile
// @access  Private
exports.getProfile = async (req, res) => {
    try {
        const [user] = await db.query(
            'SELECT u.id, u.username, u.email, u.phone, u.shop_name, u.branch_name, u.address, u.role_id, u.status, r.name as role_name, u.created_at FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = ?', 
            [req.user.id]
        );
        
        if (user.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        
        res.json(user[0]);

    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ message: 'Server error fetching profile.' });
    }
};

// @desc    Update user profile (Current User)
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res) => {
    const userId = req.user.id;
    const { username, email, phone, shop_name, branch_name, address } = req.body;

    try {
        let fields = [];
        let values = [];

        if (username !== undefined) {
            fields.push('username = ?');
            values.push(username);
        }
        if (email !== undefined) {
            fields.push('email = ?');
            values.push(email);
        }
        if (phone !== undefined) {
            fields.push('phone = ?');
            values.push(phone);
        }
        if (shop_name !== undefined) {
            fields.push('shop_name = ?');
            values.push(shop_name);
        }
        if (branch_name !== undefined) {
            fields.push('branch_name = ?');
            values.push(branch_name);
        }
        if (address !== undefined) {
            fields.push('address = ?');
            values.push(address);
        }
        
        if (fields.length === 0) {
            return res.status(400).json({ message: 'No fields provided for update.' });
        }

        const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
        values.push(userId);

        const [result] = await db.query(query, values);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Get updated user data
        const [updatedUser] = await db.query(
            'SELECT u.id, u.username, u.email, u.phone, u.shop_name, u.branch_name, u.address, u.role_id, u.status, r.name as role_name FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = ?', 
            [userId]
        );

        res.json({ 
            message: 'Profile updated successfully', 
            user: updatedUser[0] 
        });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Email already in use by another user.' });
        }
        console.error('Database error on profile update:', error);
        res.status(500).json({ message: 'Server error updating profile.' });
    }
};

// @desc    Change password (Current User)
// @route   PUT /api/users/change-password
// @access  Private
exports.changePassword = async (req, res) => {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current password and new password are required.' });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
    }

    try {
        // Get current user with password
        const [users] = await db.query(
            'SELECT id, password FROM users WHERE id = ?', 
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const user = users[0];

        // Verify current password
        const isCurrentPasswordValid = bcrypt.compareSync(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({ message: 'Current password is incorrect.' });
        }

        // Hash new password
        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(newPassword, salt);

        // Update password
        await db.query(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, userId]
        );

        res.json({ message: 'Password changed successfully' });

    } catch (error) {
        console.error('Database error on password change:', error);
        res.status(500).json({ message: 'Server error changing password.' });
    }
};

// @desc    Get all users (for Admin dashboard)
// @route   GET /api/users/all
// @access  Private (Admin)
exports.getAllUsers = async (req, res) => {
    try {
        console.log('🔍 Fetching all users for admin...');
        console.log('👤 Request user role_id:', req.user.role_id);
        
        // Check if user is admin (role_id = 1)
        if (req.user.role_id !== 1) {
            console.log('❌ Access denied: User is not admin');
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied. Admin privileges required.' 
            });
        }

        const query = `
            SELECT 
                u.id, 
                u.username, 
                u.email, 
                u.phone, 
                u.shop_name, 
                u.branch_name, 
                u.address, 
                u.role_id, 
                COALESCE(r.name, 'Staff') AS role_name, 
                u.created_at,
                COALESCE(u.status, 'active') as status
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            ORDER BY u.created_at DESC
        `;
        
        console.log('📊 Executing query...');
        const [users] = await db.query(query);
        
        console.log(`✅ Found ${users.length} users`);
        
        // Return just the array of users for frontend compatibility
        res.json(users);
        
    } catch (error) {
        console.error('❌ Error fetching all users:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error fetching user list.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Update a specific user's details (for Admin)
// @route   PUT /api/users/:id
// @access  Private (Admin)
exports.updateUser = async (req, res) => {
    const userIdToUpdate = req.params.id;
    const { username, email, role_name, phone, shop_name, branch_name, address, status } = req.body;

    try {
        // Check if user is admin
        if (req.user.role_id !== 1) {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied. Admin privileges required.' 
            });
        }

        let role_id = null;
        if (role_name) {
            role_id = ROLE_MAP[role_name];
            if (!role_id) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Invalid role name provided.' 
                });
            }
        }
        
        let fields = [];
        let values = [];

        if (username !== undefined) {
            fields.push('username = ?');
            values.push(username);
        }
        if (email !== undefined) {
            fields.push('email = ?');
            values.push(email);
        }
        if (role_id !== null) {
            fields.push('role_id = ?');
            values.push(role_id);
        }
        if (phone !== undefined) {
            fields.push('phone = ?');
            values.push(phone);
        }
        if (shop_name !== undefined) {
            fields.push('shop_name = ?');
            values.push(shop_name);
        }
        if (branch_name !== undefined) {
            fields.push('branch_name = ?');
            values.push(branch_name);
        }
        if (address !== undefined) {
            fields.push('address = ?');
            values.push(address);
        }
        if (status !== undefined) {
            fields.push('status = ?');
            values.push(status);
        }
        
        if (fields.length === 0) {
            return res.status(400).json({ 
                success: false,
                message: 'No fields provided for update.' 
            });
        }

        const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
        values.push(userIdToUpdate);

        const [result] = await db.query(query, values);

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found or no changes made.' 
            });
        }

        res.json({ 
            success: true,
            message: 'User updated successfully', 
            id: parseInt(userIdToUpdate) 
        });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ 
                success: false,
                message: 'Email already in use by another user.' 
            });
        }
        console.error('Database error on user update:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error updating user.' 
        });
    }
};

// @desc    Delete a specific user (for Admin)
// @route   DELETE /api/users/:id
// @access  Private (Admin)
exports.deleteUser = async (req, res) => {
    const { id } = req.params;

    try {
        // Check if user is admin
        if (req.user.role_id !== 1) {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied. Admin privileges required.' 
            });
        }

        if (req.user.id === parseInt(id)) {
            return res.status(403).json({ 
                success: false,
                message: 'You cannot delete your own active user account.' 
            });
        }
        
        const [result] = await db.query('DELETE FROM users WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found.' 
            });
        }

        res.json({ 
            success: true,
            message: `User ${id} deleted successfully.` 
        });
    } catch (error) {
        console.error('Database error on user deletion:', error);
        if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451) {
            return res.status(400).json({ 
                success: false,
                message: 'Cannot delete user: They are linked to existing records (products or invoices).' 
            });
        }
        res.status(500).json({ 
            success: false,
            message: 'Server error deleting user.' 
        });
    }
};

// @desc    Get user by ID (for Admin)
// @route   GET /api/users/:id
// @access  Private (Admin)
exports.getUserById = async (req, res) => {
    const { id } = req.params;

    try {
        // Check if user is admin
        if (req.user.role_id !== 1) {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied. Admin privileges required.' 
            });
        }

        const query = `
            SELECT 
                u.id, 
                u.username, 
                u.email, 
                u.phone, 
                u.shop_name, 
                u.branch_name, 
                u.address, 
                u.role_id, 
                COALESCE(r.name, 'Staff') AS role_name, 
                u.created_at,
                COALESCE(u.status, 'active') as status
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.id = ?
        `;
        
        const [users] = await db.query(query, [id]);
        
        if (users.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found.' 
            });
        }

        res.json({
            success: true,
            user: users[0]
        });

    } catch (error) {
        console.error('Error fetching user by ID:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error fetching user details.' 
        });
    }
};

// @desc    Debug endpoint to check user info
// @route   GET /api/users/debug/user-info
// @access  Private
exports.debugUserInfo = async (req, res) => {
    try {
        res.json({
            user: req.user,
            isAdmin: req.user.role_id === 1,
            message: 'Debug user info'
        });
    } catch (error) {
        console.error('Debug error:', error);
        res.status(500).json({ message: 'Debug endpoint error' });
    }
};