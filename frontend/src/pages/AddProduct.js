// src/pages/AddProduct.js
import React, { useState, useEffect } from "react";
import api from "../api/axiosConfig";
import { useNavigate } from "react-router-dom";
import ProductScanner from "../components/ProductScanner";
import "../App.css";

function AddProduct() {
  const [formData, setFormData] = useState({
    name: "",
    category_id: "",
    location_id: "",
    quantity: 0,
    retail_price: "",
    cost_price: "",
    batch_no: "",
    manufactured_date: "",
    expiry_date: "",
  });
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  // Format currency in Indian Rupees for display
  const formatINR = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return '₹0.00';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get("/categories");
        setCategories(res.data);
      } catch (err) {
        console.error("Error fetching categories:", err);
      }
    };

    const fetchLocations = async () => {
        try {
            const res = await api.get("/locations");
            setLocations(res.data);
        } catch (err) {
            console.error("Error fetching locations:", err);
        }
    };

    fetchCategories();
    fetchLocations();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const isNumberField = ['quantity', 'retail_price', 'cost_price'].includes(name);
    
    setFormData({ 
        ...formData, 
        [name]: isNumberField ? (value === "" ? "" : parseFloat(value) || value) : value
    });
    
    // Clear messages when user starts typing
    setError("");
    setSuccess("");
  };

  // Find category ID by name
  const findCategoryId = (categoryName) => {
    if (!categoryName || !categories.length) return '';
    
    const category = categories.find(cat => 
      cat.name && cat.name.toLowerCase().trim() === categoryName.toLowerCase().trim()
    );
    
    if (category) {
      console.log(`✅ Category "${categoryName}" found with ID: ${category.id}`);
      return category.id.toString();
    }
    
    console.warn(`⚠️ Category "${categoryName}" not found in available categories:`, categories.map(c => c.name));
    return '';
  };

  // Convert date format from DD-MM-YYYY to YYYY-MM-DD for HTML date input
  const formatDateForInput = (dateStr) => {
    if (!dateStr) return '';
    // Handle DD-MM-YYYY format
    if (dateStr.includes('-') && dateStr.split('-')[0].length === 2) {
      const [day, month, year] = dateStr.split('-');
      return `${year}-${month}-${day}`;
    }
    return dateStr;
  };

  // Parse QR JSON data into separate fields
  const parseQRData = (rawData) => {
    try {
      const parsed = JSON.parse(rawData);
      console.log('Parsed QR data:', parsed);
      return {
        name: parsed.name || '',
        category_id: findCategoryId(parsed.category),
        retail_price: parsed.retail_price || parsed.price || '',
        cost_price: parsed.cost_price || '',
        manufactured_date: formatDateForInput(parsed.mfg || parsed.manufactured_date || ''),
        expiry_date: formatDateForInput(parsed.exp || parsed.expiry_date || ''),
        batch_no: parsed.batch || parsed.batch_no || ''
      };
    } catch (error) {
      console.log('Not JSON data, treating as plain text');
      return null;
    }
  };

  // Handle scan completion from scanner
  const handleScanComplete = (scannedData) => {
    console.log('Scanned product data:', scannedData);
    
    if (scannedData.foundInDatabase) {
      // Product found in database - populate all fields
      setFormData({
        name: scannedData.name || "",
        category_id: scannedData.category_id || "",
        location_id: scannedData.location_id || "",
        quantity: scannedData.quantity || 0,
        retail_price: scannedData.retail_price || "",
        cost_price: scannedData.cost_price || "",
        batch_no: scannedData.batch_no || "",
        manufactured_date: scannedData.manufactured_date || "",
        expiry_date: scannedData.expiry_date || "",
      });
      
      let message = `Product "${scannedData.name}" found! `;
      if (scannedData.days_until_expiry !== null) {
        if (scannedData.days_until_expiry < 0) {
          message += `⚠️ This product expired ${Math.abs(scannedData.days_until_expiry)} days ago.`;
        } else if (scannedData.days_until_expiry <= 30) {
          message += `⚠️ This product expires in ${scannedData.days_until_expiry} days.`;
        } else {
          message += `✅ This product expires in ${scannedData.days_until_expiry} days.`;
        }
      }
      
      if (scannedData.selectedFromMultiple) {
        message += ` (Selected from multiple matches)`;
      }
      
      setSuccess(message + ' You can modify the details below if needed.');
    } else {
      // Try to parse QR data as JSON first
      const parsedQR = parseQRData(scannedData.rawData);
      
      if (parsedQR) {
        // QR contains JSON data - populate fields
        const categoryFound = parsedQR.category_id !== '';
        
        setFormData(prev => ({
          ...prev,
          name: parsedQR.name || prev.name,
          category_id: parsedQR.category_id || prev.category_id,
          retail_price: parsedQR.retail_price || prev.retail_price,
          cost_price: parsedQR.cost_price || prev.cost_price,
          manufactured_date: parsedQR.manufactured_date || prev.manufactured_date,
          expiry_date: parsedQR.expiry_date || prev.expiry_date,
          batch_no: parsedQR.batch_no || prev.batch_no
        }));
        
        let message = 'QR code data parsed successfully!';
        if (!categoryFound && parsedQR.name) {
          message += ` ⚠️ Category "${JSON.parse(scannedData.rawData).category}" not found - please select manually.`;
        }
        setSuccess(message);
        
        // Debug: Log the category selection
        console.log('Category selection debug:', {
          scannedCategory: JSON.parse(scannedData.rawData).category,
          foundCategoryId: parsedQR.category_id,
          availableCategories: categories.map(c => ({ id: c.id, name: c.name })),
          formDataAfterUpdate: { ...formData, category_id: parsedQR.category_id }
        });
      } else {
        // Fallback to original logic for non-JSON data
        setFormData(prev => ({
          ...prev,
          name: scannedData.name || prev.name,
          batch_no: scannedData.batch_no || prev.batch_no,
          expiry_date: scannedData.expiry_date || prev.expiry_date,
          manufactured_date: scannedData.manufactured_date || prev.manufactured_date,
          retail_price: scannedData.retail_price || scannedData.price || prev.retail_price,
          cost_price: scannedData.cost_price || (scannedData.price ? (parseFloat(scannedData.price) * 0.8).toFixed(2) : prev.cost_price)
        }));
        
        if (scannedData.manualEntry) {
          setSuccess('Product information entered manually. Please review and submit.');
        } else if (scannedData.hasExpiry) {
          setSuccess('Expiry date extracted from barcode! Please fill in the remaining product details.');
        } else {
          setSuccess('Barcode scanned! Please fill in the product details.');
        }
      }
    }

    setShowScanner(false);
  };

  // Auto-calculate cost price if retail price changes (only when cost price is empty)
  useEffect(() => {
    if (formData.retail_price && !formData.cost_price) {
      const costPrice = (parseFloat(formData.retail_price) * 0.8).toFixed(2);
      setFormData(prev => ({ ...prev, cost_price: costPrice }));
    }
  }, [formData.retail_price, formData.cost_price]);

  // Validate form before submission
  const validateForm = () => {
    if (!formData.name.trim()) {
      setError("Product name is required");
      return false;
    }
    if (!formData.quantity || parseFloat(formData.quantity) < 0) {
      setError("Quantity must be a positive number");
      return false;
    }
    if (!formData.retail_price || parseFloat(formData.retail_price) <= 0) {
      setError("Retail price must be a positive number");
      return false;
    }
    if (!formData.cost_price || parseFloat(formData.cost_price) <= 0) {
      setError("Cost price must be a positive number");
      return false;
    }
    if (!formData.expiry_date) {
      setError("Expiry date is required");
      return false;
    }
    
    // Check if expiry date is in the future
    const expiryDate = new Date(formData.expiry_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time for date-only comparison
    if (expiryDate <= today) {
      setError("Expiry date must be in the future");
      return false;
    }

    return true;
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      const dataToSend = {
        name: formData.name.trim(),
        category_id: formData.category_id || null, 
        location_id: formData.location_id || null, 
        quantity: parseFloat(formData.quantity) || 0,
        retail_price: parseFloat(formData.retail_price) || 0.00,
        cost_price: parseFloat(formData.cost_price) || 0.00,
        batch_no: formData.batch_no || null,
        manufactured_date: formData.manufactured_date || null,
        expiry_date: formData.expiry_date, 
      };

      console.log('Submitting product data:', dataToSend);

      const response = await api.post("/products", dataToSend);
      
      setSuccess(`Product "${formData.name}" added successfully with real-time monitoring!`);
      
      // Reset form after successful submission
      setFormData({
        name: "",
        category_id: "",
        location_id: "",
        quantity: 0,
        retail_price: "",
        cost_price: "",
        batch_no: "",
        manufactured_date: "",
        expiry_date: "",
      });

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);

    } catch (err) {
      console.error("Product add error details:", err);
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.dbError ||
        "Failed to add product. Please ensure all required fields are filled correctly.";
      setError(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const quickFillSample = () => {
    setFormData({
      name: "Premium Olive Oil",
      category_id: "",
      location_id: "",
      quantity: 50,
      retail_price: "899.99",
      cost_price: "649.99",
      batch_no: "BATCH2024",
      manufactured_date: "2024-01-15",
      expiry_date: "2025-12-31",
    });
    setSuccess("Sample data filled. Please modify as needed.");
  };

  const clearForm = () => {
    setFormData({
      name: "",
      category_id: "",
      location_id: "",
      quantity: 0,
      retail_price: "",
      cost_price: "",
      batch_no: "",
      manufactured_date: "",
      expiry_date: "",
    });
    setError("");
    setSuccess("Form cleared.");
  };

  return (
    <div className="container fade-in">
      <div className="card">
        {/* Header with Scanner Button */}
        <div className="card-header">
          <div>
            <h1 className="card-title">Add New Product</h1>
            <p className="card-subtitle">Scan barcode or manually enter product details</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button 
              className="btn btn-primary"
              onClick={() => setShowScanner(true)}
              type="button"
            >
              <span>📷</span>
              Scan Product
            </button>
            <button 
              className="btn btn-secondary"
              onClick={quickFillSample}
              type="button"
            >
              <span>⚡</span>
              Quick Fill
            </button>
            <button 
              className="btn btn-ghost"
              onClick={clearForm}
              type="button"
            >
              <span>🗑️</span>
              Clear Form
            </button>
          </div>
        </div>

        {/* Scanner Modal */}
        {showScanner && (
          <ProductScanner 
            onScanComplete={handleScanComplete}
            onClose={() => setShowScanner(false)}
          />
        )}

        {/* Success Message */}
        {success && (
          <div style={{ 
            background: 'rgba(16, 185, 129, 0.1)', 
            color: 'var(--success-emerald)', 
            padding: '1rem', 
            borderRadius: 'var(--radius-lg)',
            marginBottom: '1.5rem',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span>✅</span>
            {success}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            color: 'var(--error-red)', 
            padding: '1rem', 
            borderRadius: 'var(--radius-lg)',
            marginBottom: '1.5rem',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span>❌</span>
            {error}
          </div>
        )}

        {/* Product Form */}
        <form onSubmit={submit}>
          <div className="form-group">
            {/* Product Name */}
            <div>
              <label className="form-label">Product Name *</label>
              <input 
                className="form-input" 
                name="name" 
                placeholder="Enter product name" 
                value={formData.name} 
                onChange={handleChange} 
                required 
              />
            </div>

            {/* Category and Location Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="form-label">Category</label>
                <select 
                  className="form-input form-select" 
                  name="category_id" 
                  value={formData.category_id} 
                  onChange={handleChange}
                >
                  <option value="">-- Select Category --</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Location</label>
                <select 
                  className="form-input form-select" 
                  name="location_id" 
                  value={formData.location_id} 
                  onChange={handleChange}
                >
                  <option value="">-- Select Location --</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className="form-label">Quantity *</label>
              <input 
                className="form-input" 
                type="number" 
                name="quantity" 
                placeholder="Enter quantity" 
                value={formData.quantity} 
                onChange={handleChange} 
                min="0"
                required 
              />
            </div>

            {/* Price Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="form-label">
                  Retail Price (Selling) *
                  {formData.retail_price && (
                    <span style={{ color: 'var(--success-emerald)', marginLeft: '0.5rem', fontSize: '0.8rem' }}>
                      {formatINR(formData.retail_price)}
                    </span>
                  )}
                </label>
                <input 
                  className="form-input" 
                  type="number" 
                  step="0.01" 
                  name="retail_price" 
                  placeholder="0.00" 
                  value={formData.retail_price} 
                  onChange={handleChange} 
                  min="0"
                  required
                />
              </div>

              <div>
                <label className="form-label">
                  Cost Price (Purchase) *
                  {formData.cost_price && (
                    <span style={{ color: 'var(--error-red)', marginLeft: '0.5rem', fontSize: '0.8rem' }}>
                      {formatINR(formData.cost_price)}
                    </span>
                  )}
                </label>
                <input 
                  className="form-input" 
                  type="number" 
                  step="0.01" 
                  name="cost_price" 
                  placeholder="0.00" 
                  value={formData.cost_price} 
                  onChange={handleChange} 
                  min="0"
                  required
                />
              </div>
            </div>

            {/* Profit Calculation Display */}
            {formData.retail_price && formData.cost_price && (
              <div style={{ 
                background: 'rgba(16, 185, 129, 0.05)', 
                padding: '1rem', 
                borderRadius: 'var(--radius-lg)', 
                border: '1px solid rgba(16, 185, 129, 0.2)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '600', color: 'var(--success-emerald)' }}>Profit Margin:</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--success-emerald)' }}>
                    {formatINR(formData.retail_price - formData.cost_price)} 
                    <span style={{ fontSize: '0.8rem', marginLeft: '0.5rem', color: 'var(--gray-600)' }}>
                      ({(((formData.retail_price - formData.cost_price) / formData.cost_price) * 100).toFixed(1)}%)
                    </span>
                  </span>
                </div>
              </div>
            )}

            {/* Batch Number */}
            <div>
              <label className="form-label">Batch Number</label>
              <input 
                className="form-input" 
                name="batch_no" 
                placeholder="Enter batch number (optional)" 
                value={formData.batch_no} 
                onChange={handleChange} 
              />
            </div>

            {/* Date Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="form-label">Manufactured Date</label>
                <input 
                  className="form-input" 
                  type="date" 
                  name="manufactured_date" 
                  value={formData.manufactured_date} 
                  onChange={handleChange} 
                />
              </div>

              <div>
                <label className="form-label">Expiry Date *</label>
                <input 
                  className="form-input" 
                  type="date" 
                  name="expiry_date" 
                  value={formData.expiry_date} 
                  onChange={handleChange} 
                  required
                />
                {formData.expiry_date && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--gray-600)', marginTop: '0.5rem' }}>
                    {(() => {
                      const expiry = new Date(formData.expiry_date);
                      const today = new Date();
                      const diffTime = expiry - today;
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      
                      if (diffDays < 0) {
                        return <span style={{ color: 'var(--error-red)' }}>❌ Expired {Math.abs(diffDays)} days ago</span>;
                      } else if (diffDays <= 30) {
                        return <span style={{ color: 'var(--warning-amber)' }}>⚠️ Expires in {diffDays} days</span>;
                      } else {
                        return <span style={{ color: 'var(--success-emerald)' }}>✅ Expires in {diffDays} days</span>;
                      }
                    })()}
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button 
              className="btn btn-success btn-lg"
              type="submit"
              disabled={loading}
              style={{ width: '100%', marginTop: '1rem' }}
            >
              {loading ? (
                <>
                  <div className="loading-spinner"></div>
                  Adding Product...
                </>
              ) : (
                <>
                  <span style={{ fontSize: '1.2em' }}>➕</span>
                  Add Product to Inventory
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddProduct;