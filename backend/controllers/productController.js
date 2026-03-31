const db = require('../db');

// @desc    Get dashboard products for current user
// @route   GET /api/products/dashboard
// @access  Private
exports.getDashboardProducts = async (req, res) => {
    try {
        const sqlQuery = `
            SELECT 
                p.id, p.name, p.quantity, p.expiry_date, p.manufactured_date, p.batch_no,
                p.retail_price, p.cost_price,
                p.user_id, p.category_id, p.location_id,
                c.name AS category_name,
                c.expiry_threshold_days,
                l.name AS location_name
            FROM SE_products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN locations l ON p.location_id = l.id
            WHERE p.user_id = ?
            ORDER BY p.expiry_date ASC
        `;
        const [products] = await db.query(sqlQuery, [req.user.id]);
        res.json(products);
    } catch (error) {
        console.error('Error fetching dashboard products:', error);
        res.status(500).json({ message: 'Server error fetching inventory data.', dbError: error.sqlMessage });
    }
};

// @desc    Create a new product
// @route   POST /api/products
// @access  Private
exports.createProduct = async (req, res) => {
    const { 
        name, quantity, expiry_date, manufactured_date, batch_no, 
        retail_price, cost_price, category_id, location_id
    } = req.body;

    if (!name || quantity === undefined || !retail_price || !cost_price) {
        return res.status(400).json({ message: 'Missing required fields: name, quantity, retail_price, and cost_price.' });
    }

    const user_id = req.user.id;

    try {
        const sqlQuery = `
            INSERT INTO SE_products 
            (name, quantity, expiry_date, manufactured_date, batch_no, 
             retail_price, cost_price, category_id, location_id, user_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await db.query(sqlQuery, [
            name, quantity, expiry_date || null, manufactured_date || null, 
            batch_no || null, retail_price, cost_price, category_id || null, 
            location_id || null, user_id
        ]);
        
        res.status(201).json({ 
            id: result.insertId, 
            name, 
            message: 'Product added successfully.' 
        });
    } catch (error) {
        console.error('Database error on product creation:', error);
        res.status(500).json({ message: 'Server error adding product.', dbError: error.sqlMessage });
    }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private
exports.updateProduct = async (req, res) => {
    const { id } = req.params;
    const { 
        name, quantity, expiry_date, manufactured_date, batch_no, 
        retail_price, cost_price, category_id, location_id
    } = req.body;

    if (!name || quantity === undefined || !retail_price || !cost_price) {
        return res.status(400).json({ message: 'Missing required fields: name, quantity, retail_price, or cost_price.' });
    }

    try {
        const sqlQuery = `
            UPDATE SE_products SET 
                name = ?, 
                quantity = ?, 
                manufactured_date = ?, 
                batch_no = ?, 
                retail_price = ?, 
                cost_price = ?, 
                category_id = ?, 
                location_id = ?,
                expiry_date = ?
            WHERE id = ? AND user_id = ?
        `;
        const [result] = await db.query(sqlQuery, [
            name, 
            quantity, 
            manufactured_date || null, 
            batch_no || null, 
            retail_price, 
            cost_price, 
            category_id || null, 
            location_id || null, 
            expiry_date,
            id,
            req.user.id
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Product not found or no changes made.' });
        }

        res.json({ message: 'Product updated successfully', id: parseInt(id) });
    } catch (error) {
        console.error('Database error on product update:', error);
        res.status(500).json({ message: 'Server error updating product.', dbError: error.sqlMessage });
    }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private
exports.deleteProduct = async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await db.query('DELETE FROM SE_products WHERE id = ? AND user_id = ?', [id, req.user.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Product not found.' });
        }

        res.json({ message: `Product ${id} deleted successfully.` });
    } catch (error) {
        console.error('Database error on product deletion:', error);
        if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451) {
            return res.status(400).json({ message: 'Cannot delete product: It is referenced in existing invoices or bills.', dbError: error.sqlMessage });
        }
        res.status(500).json({ message: 'Server error deleting product.', dbError: error.sqlMessage });
    }
};

// @desc    Get all products with filtering
// @route   GET /api/products
// @access  Private
exports.getProducts = async (req, res) => {
    try {
        const userId = req.user.id;
        const userShopId = req.user.shop_id;
        
        let sqlQuery = `
            SELECT p.*, u.username as added_by, c.name as category_name,
                   l.name as location_name,
                   DATEDIFF(p.expiry_date, CURDATE()) as days_until_expiry
            FROM SE_products p
            LEFT JOIN users u ON p.user_id = u.id
            LEFT JOIN categories c ON p.category_id = c.id  
            LEFT JOIN locations l ON p.location_id = l.id
        `;
        
        let queryParams = [];

        // If user belongs to a shop, only show products from that shop
        if (userShopId) {
            sqlQuery += ` WHERE u.shop_id = ?`;
            queryParams.push(userShopId);
        }

        sqlQuery += ` ORDER BY p.expiry_date ASC`;

        const [products] = await db.query(sqlQuery, queryParams);
        
        res.json({
            success: true,
            products: products
        });

    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching products'
        });
    }
};

// @desc    Add product with shop context
// @route   POST /api/products/add
// @access  Private
exports.addProduct = async (req, res) => {
    try {
        const userId = req.user.id;
        const { 
            name, quantity, retail_price, cost_price, batch_no, 
            manufactured_date, expiry_date, category_id, location_id
        } = req.body;

        // Verify user has permission to add products
        if (req.user.shop_id) {
            const [permCheck] = await db.query(`
                SELECT can_manage_products FROM shop_permissions 
                WHERE shop_id = ? AND user_id = ?
            `, [req.user.shop_id, userId]);

            if (permCheck.length === 0 || !permCheck[0].can_manage_products) {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have permission to add products'
                });
            }
        }

        const [result] = await db.query(`
            INSERT INTO SE_products 
            (name, quantity, retail_price, cost_price, batch_no, 
             manufactured_date, expiry_date, user_id, category_id, location_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [name, quantity, retail_price, cost_price, batch_no, 
            manufactured_date, expiry_date, userId, category_id, location_id]);

        console.log(`✅ Product added by user ${userId} in shop ${req.user.shop_id}`);

        res.status(201).json({
            success: true,
            message: 'Product added successfully',
            product_id: result.insertId
        });

    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding product'
        });
    }
};

// @desc    Process scanned barcode to find existing products
// @route   POST /api/products/scan
// @access  Private
exports.processScannedProduct = async (req, res) => {
    try {
        const { scannedData } = req.body;
        const user_id = req.user.id;

        console.log('🔍 Processing scanned data:', scannedData);

        // Try to find existing product by various methods
        let products = [];
        
        // Method 1: Direct ID lookup if scanned data is numeric
        if (/^\d+$/.test(scannedData)) {
            const [idResults] = await db.query(`
                SELECT p.*, c.name as category_name, l.name as location_name,
                       DATEDIFF(p.expiry_date, CURDATE()) as days_until_expiry
                FROM SE_products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN locations l ON p.location_id = l.id
                WHERE p.id = ? AND p.user_id = ?
            `, [parseInt(scannedData), user_id]);
            products = idResults;
        }
        
        // Method 2: Batch number lookup
        if (products.length === 0) {
            const [batchResults] = await db.query(`
                SELECT p.*, c.name as category_name, l.name as location_name,
                       DATEDIFF(p.expiry_date, CURDATE()) as days_until_expiry
                FROM SE_products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN locations l ON p.location_id = l.id
                WHERE p.batch_no = ? AND p.user_id = ?
            `, [scannedData, user_id]);
            products = batchResults;
        }
        
        // Method 3: Partial name match
        if (products.length === 0) {
            const [nameResults] = await db.query(`
                SELECT p.*, c.name as category_name, l.name as location_name,
                       DATEDIFF(p.expiry_date, CURDATE()) as days_until_expiry
                FROM SE_products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN locations l ON p.location_id = l.id
                WHERE p.name LIKE ? AND p.user_id = ?
                LIMIT 5
            `, [`%${scannedData}%`, user_id]);
            products = nameResults;
        }

        if (products.length > 0) {
            console.log(`✅ Found ${products.length} matching product(s)`);
            return res.json({
                success: true,
                found: true,
                products: products,
                message: `Found ${products.length} matching product(s)`
            });
        } else {
            console.log('❌ No existing products found');
            return res.json({
                success: true,
                found: false,
                products: [],
                message: 'No existing products found. You can add this as a new product.',
                scannedData: scannedData
            });
        }

    } catch (error) {
        console.error('Error processing scanned product:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing scanned product',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Get categories and locations for scanner
// @route   GET /api/products/scanner-data
// @access  Private
exports.getScannerData = async (req, res) => {
    try {
        console.log('🔍 Fetching scanner data for user:', req.user.id);
        
        // Fetch categories - simplified query
        const [categories] = await db.query(`
            SELECT id, name 
            FROM categories 
            WHERE id IS NOT NULL
            ORDER BY name ASC
        `);
        
        // Fetch locations - simplified query  
        const [locations] = await db.query(`
            SELECT id, name 
            FROM locations 
            WHERE id IS NOT NULL
            ORDER BY name ASC
        `);

        console.log('📊 Categories found:', categories);
        console.log('📍 Locations found:', locations);
        console.log(`✅ Found ${categories?.length || 0} categories and ${locations?.length || 0} locations`);

        // Always return arrays, even if empty
        const responseData = {
            success: true,
            categories: categories || [],
            locations: locations || []
        };

        console.log('📦 Final response data:', responseData);
        res.json(responseData);

    } catch (error) {
        console.error('❌ Database error fetching scanner data:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching scanner data from database',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            categories: [],
            locations: []
        });
    }
};

// @desc    Search products by barcode or product ID
// @route   GET /api/products/barcode/:barcode
// @access  Private
exports.getProductByBarcode = async (req, res) => {
    try {
        const { barcode } = req.params;
        console.log('🔍 Searching for product with barcode/ID:', barcode);
        
        // Search by product ID first, then by name (partial match)
        const [products] = await db.query(`
            SELECT p.*, c.name as category_name, l.name as location_name,
                   DATEDIFF(p.expiry_date, CURDATE()) as days_until_expiry
            FROM SE_products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN locations l ON p.location_id = l.id
            WHERE (p.id = ? OR p.name LIKE ? OR p.batch_no = ?)
            AND p.user_id = ?
            ORDER BY p.expiry_date ASC
            LIMIT 5
        `, [barcode, `%${barcode}%`, barcode, req.user.id]);

        if (products.length > 0) {
            console.log(`✅ Found ${products.length} matching product(s)`);
            res.json({
                success: true,
                products: products,
                message: `Found ${products.length} matching product(s)`
            });
        } else {
            console.log('❌ No products found for barcode:', barcode);
            res.status(404).json({
                success: false,
                message: 'No products found matching this barcode',
                products: []
            });
        }

    } catch (error) {
        console.error('Error in barcode search:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing barcode search',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Bulk update products
// @route   PUT /api/products/bulk/update
// @access  Private
exports.bulkUpdateProducts = async (req, res) => {
    try {
        const { products } = req.body; // Array of products with id and fields to update
        const userId = req.user.id;

        if (!Array.isArray(products) || products.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Products array is required'
            });
        }

        const results = [];
        
        for (const product of products) {
            const { id, ...updateFields } = product;
            
            if (!id) continue;

            let fields = [];
            let values = [];

            // Build dynamic update query
            Object.keys(updateFields).forEach(field => {
                fields.push(`${field} = ?`);
                values.push(updateFields[field]);
            });

            if (fields.length === 0) continue;

            values.push(id, userId);

            const sqlQuery = `UPDATE SE_products SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`;
            
            try {
                const [result] = await db.query(sqlQuery, values);
                results.push({
                    id,
                    success: result.affectedRows > 0,
                    message: result.affectedRows > 0 ? 'Updated' : 'Not found or no permission'
                });
            } catch (error) {
                results.push({
                    id,
                    success: false,
                    message: error.sqlMessage || 'Update failed'
                });
            }
        }

        res.json({
            success: true,
            message: 'Bulk update completed',
            results
        });

    } catch (error) {
        console.error('Error in bulk update:', error);
        res.status(500).json({
            success: false,
            message: 'Error performing bulk update'
        });
    }
};

// @desc    Search products by query
// @route   GET /api/products/search/:query
// @access  Private
exports.searchProducts = async (req, res) => {
    try {
        const { query } = req.params;
        const userId = req.user.id;
        
        console.log('🔍 Searching products with query:', query);
        
        const [products] = await db.query(`
            SELECT p.*, c.name as category_name, l.name as location_name,
                   DATEDIFF(p.expiry_date, CURDATE()) as days_until_expiry
            FROM SE_products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN locations l ON p.location_id = l.id
            WHERE (p.name LIKE ? OR p.batch_no LIKE ? OR p.id = ?)
            AND p.user_id = ?
            ORDER BY p.name ASC
            LIMIT 20
        `, [`%${query}%`, `%${query}%`, isNaN(query) ? 0 : parseInt(query), userId]);
        
        res.json({
            success: true,
            products: products,
            count: products.length,
            message: `Found ${products.length} products matching "${query}"`
        });
        
    } catch (error) {
        console.error('Error searching products:', error);
        res.status(500).json({
            success: false,
            message: 'Error searching products'
        });
    }
};