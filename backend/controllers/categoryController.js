const db = require('../db'); 

exports.getAllCategories = async (req, res) => {
    try {

        const query = 'SELECT id, name FROM categories ORDER BY name ASC'; 
        const [categories] = await db.query(query);
        res.json(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ message: 'Server error fetching categories.' });
    }
};
