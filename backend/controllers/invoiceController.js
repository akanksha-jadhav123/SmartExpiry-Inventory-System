const db = require("../config/db");

// Helper function to create a new MySQL connection for transactions
const createTransactionConnection = () => {
    return new Promise((resolve, reject) => {
        db.getConnection((err, connection) => {
            if (err) return reject(err);
            resolve(connection);
        });
    });
};
// Create a new Invoice (Transaction)

exports.createInvoice = async (req, res) => {
    const userId = req.user.id;
    const { customer_id, invoice_date, items } = req.body;
    
    // Basic validation
    if (!invoice_date || !items || items.length === 0) {
        return res.status(400).json({ message: "Missing required fields (invoice date or line items)." });
    }
    
    let connection;
    try {
        connection = await createTransactionConnection();
        await connection.beginTransaction();

        let total_amount = 0;

        // Check inventory availability and calculate total
        for (const item of items) {
            if (!item.product_id || !item.quantity_sold || !item.unit_price) {
                throw new Error("Invalid item data in request.");
            }
            
            // Fetch current product quantity
            const [productResults] = await connection.promise().query(
                "SELECT quantity FROM SE_products WHERE id = ? AND user_id = ?",
                [item.product_id, userId]
            );

            if (productResults.length === 0) {
                throw new Error(`Product ID ${item.product_id} not found or unauthorized.`);
            }
            
            const currentQuantity = productResults[0].quantity;
            const quantitySold = parseInt(item.quantity_sold, 10);

            if (quantitySold <= 0) {
                throw new Error(`Quantity sold must be positive for product ID ${item.product_id}.`);
            }

            if (currentQuantity < quantitySold) {
                throw new Error(`Insufficient stock for product ID ${item.product_id}. Available: ${currentQuantity}, Requested: ${quantitySold}`);
            }

            // Calculate subtotal and add to total_amount
            const subtotal = item.unit_price * quantitySold;
            item.subtotal = subtotal; // Store subtotal for insertion into invoice_details
            total_amount += subtotal;
        }

        //  Insert into invoices table
        const invoiceQuery = `
            INSERT INTO invoices 
            (user_id, customer_id, invoice_date, total_amount) 
            VALUES (?, ?, ?, ?)
        `;
        const [invoiceResult] = await connection.promise().query(
            invoiceQuery, 
            [userId, customer_id || null, invoice_date, total_amount]
        );
        const newInvoiceId = invoiceResult.insertId;
        
        //  Insert into invoice_details and update product quantity
        for (const item of items) {
            // Insert line item detail
            const detailQuery = `
                INSERT INTO invoice_details 
                (invoice_id, product_id, quantity_sold, unit_price, subtotal) 
                VALUES (?, ?, ?, ?, ?)
            `;
            await connection.promise().query(
                detailQuery, 
                [newInvoiceId, item.product_id, item.quantity_sold, item.unit_price, item.subtotal]
            );

            // Update product inventory (deduction)
            const updateProductQuery = `
                UPDATE SE_products 
                SET quantity = quantity - ? 
                WHERE id = ? AND user_id = ?
            `;
            await connection.promise().query(
                updateProductQuery, 
                [item.quantity_sold, item.product_id, userId]
            );
        }

        //  Commit the transaction
        await connection.commit();
        res.status(201).json({ 
            message: "Invoice created and inventory updated successfully!", 
            invoice_id: newInvoiceId 
        });

    } catch (error) {
        // If any error occurs, rollback the transaction
        if (connection) {
            await connection.rollback();
        }
        console.error("Invoice Transaction Error:", error.message || error);
        res.status(500).json({ 
            message: "Invoice creation failed. Inventory rollback performed.", 
            error: error.message || "A database error occurred." 
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

// Get a list of all Invoices for the user
exports.getInvoices = (req, res) => {
    const userId = req.user.id;

    // Query to fetch invoices, joining with customers to get the customer name
    const q = `
        SELECT 
            i.id, 
            i.invoice_date, 
            i.total_amount, 
            i.created_at,
            COALESCE(c.name, 'N/A (No Customer Selected)') AS customer_name
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        WHERE i.user_id = ?
        ORDER BY i.invoice_date DESC, i.id DESC
    `;

    db.query(q, [userId], (err, results) => {
        if (err) {
            console.error("MySQL Get Invoices Error:", err);
            return res.status(500).json({ message: "DB error: Could not fetch invoice list." });
        }
        res.json(results);
    });
};
// Get details of a single invoice (optional but useful)

exports.getInvoiceDetails = (req, res) => {
    const userId = req.user.id;
    const invoiceId = req.params.id;

    if (!invoiceId) return res.status(400).json({ message: "Missing invoice ID." });

    // Query to get main invoice data
    const mainQuery = `
        SELECT
            i.id AS invoice_id,
            i.invoice_date,
            i.total_amount,
            i.created_at,
            i.customer_id,
            c.name AS customer_name,
            c.contact_email AS customer_email,
            c.contact_phone AS customer_phone,
            c.address AS customer_address
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        WHERE i.id = ? AND i.user_id = ?
    `;

    // Query to get line items (products sold)
    const itemsQuery = `
        SELECT
            d.quantity_sold,
            d.unit_price,
            d.subtotal,
            p.name AS product_name,
            p.category,
            p.batch_no
        FROM invoice_details d
        JOIN SE_products p ON d.product_id = p.id
        WHERE d.invoice_id = ?
    `;

    db.query(mainQuery, [invoiceId, userId], (err, invoiceResults) => {
        if (err) {
            console.error("MySQL Invoice Details Main Error:", err);
            return res.status(500).json({ message: "DB error: Could not fetch invoice details." });
        }
        if (invoiceResults.length === 0) {
            return res.status(404).json({ message: "Invoice not found or unauthorized." });
        }

        const invoice = invoiceResults[0];

        db.query(itemsQuery, [invoiceId], (err, itemResults) => {
            if (err) {
                console.error("MySQL Invoice Details Items Error:", err);
                return res.status(500).json({ message: "DB error: Could not fetch invoice line items." });
            }

            // Combine invoice header and line items
            invoice.items = itemResults;
            res.json(invoice);
        });
    });
};
