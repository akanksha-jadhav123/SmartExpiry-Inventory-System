const db = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require('dotenv').config();

// Define the role mapping to convert text role to a database ID
const ROLE_MAP = {
    'Admin': 1,
    'Manager': 2,
    'Staff': 3,
};
const DEFAULT_STAFF_ROLE_ID = ROLE_MAP['Staff']; 
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

exports.register = async (req, res) => {
  const { username, email, password, phone, shopName, role, branchName, address } = req.body;
  
  const role_id = ROLE_MAP[role] || DEFAULT_STAFF_ROLE_ID;

  if (!username || !email || !password || !phone || !shopName) {
    return res.status(400).json({ message: "Missing required fields: Name, Email, Password, Phone, and Shop Name." });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
  }

  try {
    // Check if user already exists
    const checkQuery = "SELECT id FROM users WHERE email = ?";
    const [existingUsers] = await db.query(checkQuery, [email]);
    
    if (existingUsers.length > 0) {
      return res.status(409).json({ message: "This email already exists." });
    }

    // Hash the password
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    //  Insert the new user with all fields
    const insertQuery = `
        INSERT INTO users 
        (username, email, password, phone, shop_name, role_id, branch_name, address) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
  const values = [
  username,
  email,
  hashedPassword,
  phone,
  shopName,
  role_id,
  branchName || null,
  address || null
];

    const [result] = await db.query(insertQuery, values);
    
    res.status(201).json({ message: "Registered successfully. You can now log in." });

  } catch (err) {
    console.error("Registration error:", err);
    if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: "A user with this email/phone already exists." });
    }
    res.status(500).json({ message: "DB error during registration", error: err.message });
  }
};


exports.login = async (req, res) => {
    const { email, password } = req.body;
    
    console.log('Login attempt for email:', email);
    
    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required." });
    }

    try {
        // removed shop joins
        const q = `
            SELECT u.id, u.username, u.email, u.password, u.role_id, r.name as role_name
            FROM users u 
            JOIN roles r ON u.role_id = r.id 
            WHERE u.email = ?
        `;
        const [results] = await db.query(q, [email]);
        
        if (results.length === 0) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const user = results[0];
        const isPasswordValid = bcrypt.compareSync(password, user.password);

        if (isPasswordValid) {
            const token = jwt.sign(
                { 
                    id: user.id, 
                    role_id: user.role_id
                },
                JWT_SECRET, 
                { expiresIn: "7d" }
            );
            
            console.log('Login successful for user:', user.username);
            
            res.json({ 
                token, 
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role_id: user.role_id,
                    role_name: user.role_name
                },
                message: "Login successful"
            });
        } else {
            res.status(401).json({ message: "Invalid email or password" });
        }
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ message: "Server error during login", error: err.message });
    }
};