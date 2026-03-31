// db.js
require('dotenv').config();
const mysql = require('mysql2/promise');

console.log('🔧 Database Configuration:');
console.log('   Host:', process.env.DB_HOST);
console.log('   User:', process.env.DB_USER);
console.log('   Database:', process.env.DB_NAME);
console.log('   Password:', process.env.DB_PASSWORD ? '***' + process.env.DB_PASSWORD.slice(-3) : 'Not set');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'expiry_inventory',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

// Enhanced connection test with better error handling
pool.getConnection()
    .then(connection => {
        console.log("✅ Database connection established successfully.");
        connection.release();
        
        // Test query to verify database access
        return pool.query('SELECT 1 as test');
    })
    .then(([results]) => {
        console.log("✅ Database test query executed successfully.");
    })
    .catch(err => {
        console.error("❌ Database connection failed:");
        console.error("   Error:", err.message);
        console.error("   Code:", err.code);
        console.error("   Solution: Check your MySQL credentials in .env file");
        console.error("   Make sure MySQL is running and database exists");
    });

module.exports = pool;