// controllers/shopController.js
const db = require('../db');

exports.getAllShops = async (req, res) => {
    try {
        const query = `
            SELECT s.*, 
                   COUNT(DISTINCT u.id) as user_count,
                   COUNT(DISTINCT p.id) as product_count
            FROM shops s
            LEFT JOIN users u ON s.id = u.shop_id
            LEFT JOIN SE_products p ON s.id = p.shop_id
            GROUP BY s.id
            ORDER BY s.name ASC
        `;
        const [shops] = await db.query(query);
        res.json(shops);
    } catch (error) {
        console.error('Error fetching shops:', error);
        res.status(500).json({ message: 'Server error fetching shops.' });
    }
};

exports.getShopById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const query = `
            SELECT s.*, 
                   COUNT(DISTINCT u.id) as user_count,
                   COUNT(DISTINCT p.id) as product_count
            FROM shops s
            LEFT JOIN users u ON s.id = u.shop_id
            LEFT JOIN SE_products p ON s.id = p.shop_id
            WHERE s.id = ?
            GROUP BY s.id
        `;
        const [shops] = await db.query(query, [id]);
        
        if (shops.length === 0) {
            return res.status(404).json({ message: 'Shop not found.' });
        }
        
        res.json(shops[0]);
    } catch (error) {
        console.error('Error fetching shop:', error);
        res.status(500).json({ message: 'Server error fetching shop details.' });
    }
};

exports.createShop = async (req, res) => {
    try {
        const { name, description, address, contact_email, contact_phone } = req.body;
        
        if (!name) {
            return res.status(400).json({ message: 'Shop name is required.' });
        }

        const query = `
            INSERT INTO shops (name, description, address, contact_email, contact_phone, created_by)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const [result] = await db.query(query, [
            name, description, address, contact_email, contact_phone, req.user.id
        ]);

        res.status(201).json({
            message: 'Shop created successfully.',
            shop_id: result.insertId
        });
    } catch (error) {
        console.error('Error creating shop:', error);
        res.status(500).json({ message: 'Server error creating shop.' });
    }
};

exports.getShopUsers = async (req, res) => {
    try {
        const { id } = req.params;
        
        const query = `
            SELECT u.id, u.username, u.email, u.phone, u.role_id, r.name as role_name, u.created_at
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.shop_id = ?
            ORDER BY u.username ASC
        `;
        const [users] = await db.query(query, [id]);
        
        res.json(users);
    } catch (error) {
        console.error('Error fetching shop users:', error);
        res.status(500).json({ message: 'Server error fetching shop users.' });
    }
};

exports.getAvailableShops = async (req, res) => {
    try {
        const query = `
            SELECT id, name, description, address, contact_email, contact_phone
            FROM shops 
            ORDER BY name ASC
        `;
        const [shops] = await db.query(query);
        res.json(shops);
    } catch (error) {
        console.error('Error fetching available shops:', error);
        res.status(500).json({ message: 'Server error fetching shops.' });
    }
};