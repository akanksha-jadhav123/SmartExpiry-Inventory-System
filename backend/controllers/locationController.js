const db = require('../db');

exports.getAllLocations = async (req, res) => {
    try {
        // Assuming your locations table has columns: id, name, and address
        const query = 'SELECT id, name, address FROM locations ORDER BY name ASC'; 
        const [locations] = await db.query(query);
        res.json(locations);
    } catch (error) {
        console.error('Error fetching locations:', error);
        res.status(500).json({ message: 'Server error fetching locations.' });
    }
};