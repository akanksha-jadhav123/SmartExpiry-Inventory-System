const mysql = require("mysql2");

const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "Vaishnavi@1029", 
  database: "expiry_inventory",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

db.getConnection((err, conn) => {
  if (err) console.error("MySQL connection error:", err.message);
  else {
    console.log("Connected to MySQL database");
    if (conn) conn.release();
  }
});

module.exports = db;