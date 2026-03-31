// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// --- 1. Protect Middleware (Verifies JWT and loads user) ---
exports.protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, JWT_SECRET);

            // Get fresh user data from database
            const [users] = await db.query(
                'SELECT id, username, email, role_id, status FROM users WHERE id = ? AND status = "active"',
                [decoded.id]
            );

            if (users.length === 0) {
                return res.status(401).json({ message: 'User not found or inactive.' });
            }

            req.user = users[0];
            next();
        } catch (error) {
            console.error('JWT verification failed:', error.message);
            return res.status(401).json({ message: 'Not authorized, token failed or expired.' });
        }
    } else {
        return res.status(401).json({ message: 'Not authorized, no token provided.' });
    }
};

// --- 2. Admin/Staff Role Check Middleware ---
exports.isAdminOrStaff = (req, res, next) => {
    const roleId = req.user?.role_id;
    const isAdmin = roleId === 1 || roleId === '1';
    const isStaff = roleId === 3 || roleId === '3';

    if (isAdmin || isStaff) {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized for this operation. Requires Admin or Staff role.' });
    }
};

// --- 3. Admin Role Check Middleware ---
exports.isAdmin = (req, res, next) => {
    const isAdmin = req.user && (req.user.role_id === 1 || req.user.role_id === '1');

    if (isAdmin) {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized for this operation. Requires Admin role.' });
    }
};