const db = require("../config/db");

 // Endpoint to create a new Bill (Sale transaction)
 
exports.createBill = async (req, res) => {
  const userId = req.user.id;
  const { customer_name, items } = req.body;

  console.log('Creating bill for user:', userId);
  console.log('Bill data:', { customer_name, items });

  if (!items || items.length === 0) {
    return res.status(400).json({ message: "Bill must contain items." });
  }

  // Calculate total amount from items
  const total_amount = items.reduce((sum, item) => {
    const subtotal = item.sold_quantity * item.unit_price;
    return sum + subtotal;
  }, 0);

  let conn;
  try {
    // Get a connection from the pool
    conn = await db.promise().getConnection();

    await conn.beginTransaction();

    //  Insert into bills table
    const billInsertSql = "INSERT INTO bills (user_id, customer_name, total_amount) VALUES (?, ?, ?)";
    const [billResult] = await conn.query(billInsertSql, [userId, customer_name || 'Cash Customer', total_amount]);
    const billId = billResult.insertId;

    console.log('Bill created with ID:', billId);

    //  Iterate through items, insert into bill_items, and update inventory
    for (const item of items) {
      const { product_id, sold_quantity, unit_price } = item;
      const subtotal = sold_quantity * unit_price;

      console.log('Processing item:', { product_id, sold_quantity, unit_price, subtotal });

      // Check current inventory and product details before sale
      const productCheckSql = "SELECT name, quantity FROM SE_products WHERE id = ? AND user_id = ?";
      const [productCheckResult] = await conn.query(productCheckSql, [product_id, userId]);

      if (productCheckResult.length === 0) {
        throw new Error(`Product ID ${product_id} not found or unauthorized.`);
      }

      const product = productCheckResult[0];

      if (product.quantity < sold_quantity) {
        throw new Error(`Insufficient stock for product '${product.name}'. Available: ${product.quantity}, Requested: ${sold_quantity}`);
      }
      
      // Insert into bill_items
      const itemInsertSql = "INSERT INTO bill_items (bill_id, product_id, product_name, sold_quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?, ?)";
      await conn.query(itemInsertSql, [billId, product_id, product.name, sold_quantity, unit_price, subtotal]);

      // Update SE_products quantity (Decrease inventory)
      const updateInventorySql = "UPDATE SE_products SET quantity = quantity - ? WHERE id = ? AND user_id = ?";
      await conn.query(updateInventorySql, [sold_quantity, product_id, userId]);

      console.log(`Updated inventory for product ${product_id}, reduced by ${sold_quantity}`);
    }

    // Commit the transaction if all steps succeeded
    await conn.commit();
    console.log('Transaction committed successfully');

    res.status(201).json({ 
      message: "Bill created successfully and inventory updated.", 
      billId,
      total_amount 
    });

  } catch (error) {
    console.error("Create Bill Error:", error);
    
    if (conn) {
      // Rollback transaction on any error
      await conn.rollback();
      console.error("Transaction rolled back due to error:", error.message);
    }
    
    res.status(500).json({ 
      message: "Failed to create bill and update inventory.", 
      error: error.message 
    });
  } finally {
    if (conn) {
      conn.release();
      console.log('Database connection released');
    }
  }
};
// Get all bills for the logged-in user
 
exports.getAllBills = async (req, res) => {
  const userId = req.user.id;
  const q = "SELECT id, customer_name, total_amount, bill_date FROM bills WHERE user_id = ? ORDER BY bill_date DESC";
  
  try {
    const [results] = await db.promise().query(q, [userId]);
    res.status(200).json(results);
  } catch (error) {
    console.error("Get All Bills Error:", error);
    res.status(500).json({ message: "Failed to fetch bills.", error: error.message });
  }
};

// Get a single bill with all its items
 
exports.getBillDetails = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const billSql = "SELECT id, customer_name, total_amount, bill_date FROM bills WHERE id = ? AND user_id = ?";
    const [billResult] = await db.promise().query(billSql, [id, userId]);

    if (billResult.length === 0) {
      return res.status(404).json({ message: "Bill not found." });
    }

    const bill = billResult[0];

    const itemsSql = "SELECT product_name, sold_quantity, unit_price, subtotal FROM bill_items WHERE bill_id = ?";
    const [itemsResult] = await db.promise().query(itemsSql, [id]);

    bill.items = itemsResult;

    res.status(200).json(bill);

  } catch (error) {
    console.error("Get Bill Details Error:", error);
    res.status(500).json({ message: "Failed to fetch bill details.", error: error.message });
  }
};