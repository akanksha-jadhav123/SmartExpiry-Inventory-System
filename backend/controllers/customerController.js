const db = require("../config/db");

// Get all customers for the logged-in user
exports.getAll = async (req, res) => {
  const userId = req.user.id;
  const q = "SELECT id, name, contact_email, contact_phone, address FROM customers WHERE user_id = ? ORDER BY name ASC";
  
  try {
    // Use promise-based query
    const [results] = await db.promise().query(q, [userId]);
    res.json(results);
  } catch (err) {
    console.error("MySQL Customer GET Error:", err);
    return res.status(500).json({ 
      message: "DB error: Could not fetch customers.", 
      dbError: err.sqlMessage || err.message 
    });
  }
};

// Add a new customer for the logged-in user
exports.add = async (req, res) => {
  const { name, contact_email, contact_phone, address } = req.body;
  const userId = req.user.id;
  
  if (!name) {
    return res.status(400).json({ message: "Missing required field: name." });
  }

  const q = "INSERT INTO customers (user_id, name, contact_email, contact_phone, address) VALUES (?, ?, ?, ?, ?)";
  
  try {
    // Use promise-based query
    const [result] = await db.promise().query(q, [userId, name, contact_email || null, contact_phone || null, address || null]);
    res.status(201).json({ message: "Customer added successfully!", id: result.insertId });
  } catch (err) {
    console.error("MySQL Customer ADD Error:", err);
    return res.status(500).json({ 
      message: "DB error: Could not add customer.", 
      dbError: err.sqlMessage || err.message 
    });
  }
};