// Default Settings
const DEFAULT_URGENT_DAYS = 7;
const DEFAULT_WARNING_DAYS = 30;

const sendMultiChannelAlert = (product, settings) => {
  const alertMessage = `URGENT ALERT: Product ${product.name} (Batch ${product.batch_no}) is expiring in ${product.days_until_expiry} days! Quantity: ${product.quantity}.`;
  
  console.log(`\n======================================================`);
  console.log(`ALERT TRIGGERED for User ID: ${settings.user_id}`);
  console.log(`Product: ${product.name}, Expiry in ${product.days_until_expiry} days.`);

  if (settings.email_alerts) {
    //  EMAIL SEND
    console.log(`[EMAIL] To: user-email@example.com (Not implemented): ${alertMessage}`);
  }
  if (settings.sms_alerts) {
    //  SMS SEND
    console.log(`[SMS] To: user-phone (Not implemented): ${alertMessage.substring(0, 160)}...`);
  }
  if (settings.whatsapp_alerts) {
    // WHATSAPP SEND
    console.log(`[WHATSAPP] To: user-whatsapp (Not implemented): ${alertMessage}`);
  }
  
  if (!settings.email_alerts && !settings.sms_alerts && !settings.whatsapp_alerts) {
    console.log(`[INFO] No external channels enabled for this user. Only in-app alert is shown.`);
  }
  console.log(`======================================================\n`);
};

// User Alert Settings

exports.getSettings = (req, res) => {
  const userId = req.user.id;

  // Select settings, or fall back to null if not found
  const q = "SELECT urgent_days, warning_days, email_alerts, sms_alerts, whatsapp_alerts FROM user_alert_settings WHERE user_id = ?";
  db.query(q, [userId], (err, results) => {
    if (err) {
      console.error("DB Error fetching alert settings:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (results.length > 0) {
      // Return existing settings
      return res.json(results[0]);
    } else {
      // Return defaults if no settings found
      return res.json({
        urgent_days: DEFAULT_URGENT_DAYS,
        warning_days: DEFAULT_WARNING_DAYS,
        email_alerts: false,
        sms_alerts: false,
        whatsapp_alerts: false,
      });
    }
  });
};

// Set/Update User Alert Settings

exports.updateSettings = (req, res) => {
  const userId = req.user.id;
  const { urgent_days, warning_days, email_alerts, sms_alerts, whatsapp_alerts } = req.body;

  if (urgent_days >= warning_days || urgent_days < 1 || warning_days < 1) {
      return res.status(400).json({ message: "Urgent days must be less than Warning days, and both must be positive." });
  }

  // Use UPSERT logic (INSERT ON DUPLICATE KEY UPDATE)
  const q = `
    INSERT INTO user_alert_settings (user_id, urgent_days, warning_days, email_alerts, sms_alerts, whatsapp_alerts) 
    VALUES (?, ?, ?, ?, ?, ?) 
    ON DUPLICATE KEY UPDATE 
      urgent_days = VALUES(urgent_days), 
      warning_days = VALUES(warning_days), 
      email_alerts = VALUES(email_alerts), 
      sms_alerts = VALUES(sms_alerts), 
      whatsapp_alerts = VALUES(whatsapp_alerts)
  `;

  const values = [userId, urgent_days, warning_days, email_alerts, sms_alerts, whatsapp_alerts];
  
  db.query(q, values, (err) => {
    if (err) {
      console.error("DB Error updating alert settings:", err);
      return res.status(500).json({ message: "Database error" });
    }
    res.status(200).json({ message: "Alert settings updated successfully" });
  });
};

// =================================================================
// 3. Get Products with Status (for Dashboard)
// =================================================================
exports.getProductsWithStatus = async (req, res) => {
  const userId = req.user.id;

  // 1. Fetch User Settings
  let settings;
  try {
    const [settingsResults] = await db.promise().query(
      "SELECT urgent_days, warning_days, email_alerts, sms_alerts, whatsapp_alerts FROM user_alert_settings WHERE user_id = ?",
      [userId]
    );

    if (settingsResults.length > 0) {
      settings = settingsResults[0];
    } else {
      // Use defaults if no settings exist
      settings = {
        urgent_days: DEFAULT_URGENT_DAYS,
        warning_days: DEFAULT_WARNING_DAYS,
        email_alerts: false,
        sms_alerts: false,
        whatsapp_alerts: false,
      };
    }
  } catch (err) {
    console.error("MySQL Settings Fetch Error:", err);
    return res.status(500).json({ message: "DB error: Could not fetch settings." });
  }

  // 2. Fetch all products for the user
  try {
    const [productResults] = await db.promise().query(
      "SELECT * FROM SE_products WHERE user_id = ? ORDER BY expiry_date ASC",
      [userId]
    );

    // 3. Process products to assign status and trigger SIMULATED external alerts
    const today = new Date();
    const processedProducts = productResults.map(p => {
      const expiryDate = new Date(p.expiry_date);
      const diffTime = expiryDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let status = 'healthy'; // Green
      
      if (diffDays <= 0) {
        status = 'expired'; // Red
      } else if (diffDays <= settings.urgent_days) {
        status = 'urgent'; // Red
        // 🌟 SIMULATE EXTERNAL ALERT FOR URGENT PRODUCTS
        sendMultiChannelAlert({...p, days_until_expiry: diffDays}, settings);
      } else if (diffDays <= settings.warning_days) {
        status = 'warning'; // Yellow
      }
      
      // Add status and days_until_expiry to the product object for frontend use
      return { ...p, status, days_until_expiry: diffDays };
    });

    // 4. Return processed data and settings
    res.json({ products: processedProducts, settings: settings });

  } catch (err) {
    console.error("MySQL Product Fetch Error:", err);
    return res.status(500).json({ message: "DB error: Could not fetch products." });
  }
};
