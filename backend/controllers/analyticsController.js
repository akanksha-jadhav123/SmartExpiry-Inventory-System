const db = require('../db');

exports.getSummaryAnalytics = async (req, res) => {
    try {
        // Calculates realized profit and revenue from recorded sales
        const query = `
            SELECT 
                SUM(id.quantity_sold * id.unit_price) AS total_revenue,
                (SUM(id.quantity_sold * id.unit_price) - SUM(id.quantity_sold * p.cost_price)) AS realized_profit,
                COUNT(DISTINCT i.id) AS total_invoices
            FROM invoice_details id
            JOIN invoices i ON id.invoice_id = i.id
            JOIN SE_products p ON id.product_id = p.id;
        `;
        const [result] = await db.query(query);

        res.json(result[0] || { total_revenue: 0, realized_profit: 0, total_invoices: 0 });

    } catch (error) {
        console.error('Error fetching analytics summary:', error);
        res.status(500).json({ message: 'Server error fetching analytics summary.' });
    }
};