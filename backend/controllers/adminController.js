const db = require('../config/db');

exports.getAdminDashboard = async (req, res) => {
  try {
    const [stats] = await db.promise().query(`
      SELECT 
        COUNT(DISTINCT s.id) as total_shops,
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT p.id) as total_products,
        COALESCE(SUM(p.quantity), 0) as total_inventory,
        COUNT(DISTINCT CASE WHEN p.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN p.id END) as expiring_soon,
        COUNT(DISTINCT CASE WHEN p.expiry_date < CURDATE() THEN p.id END) as expired
      FROM shops s
      LEFT JOIN users u ON s.id = u.shop_id
      LEFT JOIN SE_products p ON s.id = p.shop_id
      WHERE s.status = 'active'
    `);

    const [shopStats] = await db.promise().query(`
      SELECT 
        s.id,
        s.name as shop_name,
        COUNT(p.id) as product_count,
        COALESCE(SUM(p.quantity), 0) as total_quantity,
        COUNT(CASE WHEN p.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 1 END) as expiring_count
      FROM shops s
      LEFT JOIN SE_products p ON s.id = p.shop_id AND p.status = 'active'
      WHERE s.status = 'active'
      GROUP BY s.id, s.name
      ORDER BY product_count DESC
    `);

    const [recentProducts] = await db.promise().query(`
      SELECT 
        p.name,
        p.quantity,
        p.expiry_date,
        s.name as shop_name,
        DATEDIFF(p.expiry_date, CURDATE()) as days_until_expiry
      FROM SE_products p
      JOIN shops s ON p.shop_id = s.id
      WHERE p.status = 'active'
      ORDER BY p.created_at DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: {
        overview: stats[0],
        shops: shopStats,
        recentProducts
      }
    });

  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching dashboard'
    });
  }
};