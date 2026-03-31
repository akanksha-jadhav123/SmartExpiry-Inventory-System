// src/pages/Billing.js
import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "../api/axiosConfig";
import { useNavigate } from "react-router-dom"; 
import "../App.css";

function Billing() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState('info');
  const navigate = useNavigate();
  
  const userRole = localStorage.getItem("user_role_id");
  const isAdminOrStaff = userRole === "1" || userRole === "3";

  const [customers, setCustomers] = useState([]);
  const [customerSelectionType, setCustomerSelectionType] = useState('existing'); 
  const [selectedCustomer, setSelectedCustomer] = useState(""); 
  const [newCustomerName, setNewCustomerName] = useState(""); 

  const closeModal = () => setIsModalOpen(false);

  const fetchProducts = useCallback(async () => {
    if (!isAdminOrStaff) {
      return;
    }
    try {
      const response = await api.get("/products/dashboard");
      
      // Process products to ensure numbers are properly converted
      const processedProducts = response.data.map(p => ({
        ...p,
        quantity: Number(p.quantity) || 0,
        retail_price: Number(p.retail_price) || 0,
        cost_price: Number(p.cost_price) || 0
      }));
      
      const billableProducts = processedProducts.filter(p => {
        const isAvailable = p.quantity > 0;
        const isNotExpired = p.expiry_date 
          ? new Date(p.expiry_date) > new Date() 
          : true;
        
        return isAvailable && isNotExpired;
      });
      
      setProducts(billableProducts);

    } catch (err) {
      console.error("Failed to fetch billable products:", err);
      setModalMessage("Failed to load products. Check API status and console for details.");
      setModalType('error');
      setIsModalOpen(true);
    }
  }, [isAdminOrStaff]);
  
  const fetchCustomers = useCallback(async () => {
    if (!isAdminOrStaff) return;
    try {
        const response = await api.get("/customers");
        setCustomers(response.data);
        if (response.data.length > 0 && !selectedCustomer) {
            setSelectedCustomer(response.data[0].id.toString()); 
        }
    } catch (err) {
        console.error("Failed to fetch customers:", err);
        // Don't show error modal for customers - it's optional
    }
  }, [isAdminOrStaff, selectedCustomer]);

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
  }, [fetchProducts, fetchCustomers]);

  const filteredProducts = useMemo(() => {
    const lowercasedSearch = searchTerm.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(lowercasedSearch) ||
      p.category_name?.toLowerCase().includes(lowercasedSearch) ||
      p.batch_no?.toLowerCase().includes(lowercasedSearch)
    );
  }, [products, searchTerm]);

  const addToCart = (product) => {
    setCart(prevCart => {
      const existingItemIndex = prevCart.findIndex(item => item.product_id === product.id);

      if (existingItemIndex > -1) {
        const existingItem = prevCart[existingItemIndex];
        if (existingItem.quantity_sold < product.quantity) {
          return prevCart.map((item, index) =>
            index === existingItemIndex
              ? { ...item, quantity_sold: item.quantity_sold + 1 }
              : item
          );
        } else {
          setModalMessage(`Cannot add more: Max stock for ${product.name} is ${product.quantity}.`);
          setModalType('error');
          setIsModalOpen(true);
          return prevCart; 
        }
      } else {
        if (product.quantity > 0) {
          return [
            ...prevCart,
            {
              product_id: product.id,
              name: product.name,
              batch_no: product.batch_no,
              available_quantity: product.quantity,
              unit_price: product.retail_price || 10.00,
              quantity_sold: 1,
            },
          ];
        } else {
            setModalMessage(`${product.name} is out of stock.`);
            setModalType('error');
            setIsModalOpen(true);
            return prevCart;
        }
      }
    });
  };

  const handleCartItemChange = (productId, field, value) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.product_id === productId) {
          let newValue = field === 'quantity_sold' ? parseInt(value, 10) : parseFloat(value);
          if (isNaN(newValue) || newValue < 0) newValue = 0;

          if (field === 'quantity_sold' && newValue > item.available_quantity) {
            setModalMessage(`Cannot sell ${newValue} units of ${item.name}. Only ${item.available_quantity} available.`);
            setModalType('error');
            setIsModalOpen(true);
            newValue = item.available_quantity;
          }
          
          return { 
            ...item, 
            [field]: newValue,
          };
        }
        return item;
      }).filter(item => item.quantity_sold > 0); 
    });
  };

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.product_id !== productId));
  };

  const totalAmount = useMemo(() => {
    return cart.reduce((total, item) => {
        const itemSubtotal = (item.quantity_sold * item.unit_price) || 0;
        return total + itemSubtotal;
    }, 0);
  }, [cart]);

  // Format currency in Indian Rupees
  const formatINR = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return '₹0.00';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const processBill = async () => {
    setLoading(true);
    let finalCustomerName = '';

    try {
        console.log('Starting bill process...', { 
          cart, 
          customerSelectionType, 
          newCustomerName, 
          selectedCustomer,
          customers 
        });

        if (cart.length === 0) {
            throw new Error("Cannot process an empty bill.");
        }

        // Validate all cart items have valid quantities
        for (const item of cart) {
          if (item.quantity_sold <= 0) {
            throw new Error(`Invalid quantity for ${item.name}. Quantity must be greater than 0.`);
          }
          if (item.quantity_sold > item.available_quantity) {
            throw new Error(`Insufficient stock for ${item.name}. Available: ${item.available_quantity}, Requested: ${item.quantity_sold}`);
          }
        }

        // Determine customer name
        if (customerSelectionType === 'new') {
            if (!newCustomerName.trim()) {
                throw new Error("Please enter a name for the customer.");
            }
            finalCustomerName = newCustomerName.trim();
        } else if (selectedCustomer && customers.length > 0) {
            const customer = customers.find(c => c.id.toString() === selectedCustomer);
            finalCustomerName = customer?.name || 'Cash Customer';
        } else {
            finalCustomerName = 'Cash Customer';
        }

        // Prepare items for API
        const itemsToSend = cart.map(item => ({
            product_id: item.product_id,
            sold_quantity: item.quantity_sold,
            unit_price: item.unit_price,
        }));

        const billData = {
            customer_name: finalCustomerName,
            items: itemsToSend,
        };

        console.log('Sending bill data to API:', billData);

        // Add timeout and better error handling
        const response = await api.post("/billing", billData, {
            timeout: 30000 // 30 seconds timeout
        });

        console.log('Bill API response:', response.data);

        setModalMessage(`Bill processed successfully! Bill ID: ${response.data.billId}. Total Amount: ${formatINR(response.data.total_amount)}. Redirecting to dashboard...`);
        setModalType('success');
        setIsModalOpen(true);
        setCart([]);
        setNewCustomerName("");
        setSelectedCustomer(customers.length > 0 ? customers[0].id.toString() : "");
        
        setTimeout(() => {
            closeModal();
            navigate("/dashboard"); 
        }, 3000);

    } catch (err) {
        console.error("Bill processing error:", err);
        
        let errorMessage = "Failed to process bill. ";
        
        if (err.code === 'ECONNABORTED') {
            errorMessage += "Request timed out. Please try again.";
        } else if (err.response) {
            // Server responded with error status
            errorMessage += err.response.data?.message || `Server error: ${err.response.status}`;
            console.error('Server error response:', err.response.data);
        } else if (err.request) {
            // Request was made but no response received
            errorMessage += "No response from server. Please check if the backend server is running and try again.";
            console.error('Network error:', err.request);
        } else {
            // Something else happened
            errorMessage += err.message || "Unknown error occurred.";
        }
        
        setModalMessage(`Error: ${errorMessage}`);
        setModalType('error');
        setIsModalOpen(true);
    } finally {
        setLoading(false);
    }
  };

  // Safe price formatting function
  const formatPrice = (price) => {
    if (price === null || price === undefined) return 'N/A';
    const numPrice = Number(price);
    return isNaN(numPrice) ? 'N/A' : formatINR(numPrice);
  };

  if (!isAdminOrStaff) {
    return (
      <div className="container" style={{ textAlign: "center", marginTop: 50 }}>
        <h2 style={{ color: '#e74c3c' }}>Access Denied</h2>
        <p>Only authorized staff and admin can access the billing page.</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ display: 'flex', gap: 20, maxWidth: 1200, alignItems: 'flex-start' }}>
       
      {/* Left Side: Product Search & List */}
      <div className="card" style={{ flex: 2, minWidth: 300, maxHeight: '80vh', overflowY: 'auto', padding: 0 }}>
        <h2 style={{ padding: '20px', borderBottom: '1px solid #eee', margin: 0 }}>Available Products ({products.length})</h2>
        <input
          className="input"
          type="text"
          placeholder="Search products by name, category, or batch..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ margin: '10px 20px', width: 'calc(100% - 40px)' }}
        />
        <div style={{ padding: '0 20px 20px' }}>
            {filteredProducts.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#95a5a6', padding: '20px' }}>
                  {products.length === 0 ? 'No products available.' : 'No products match your search.'}
                </p>
            ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {filteredProducts.map(p => (
                        <li key={p.id} style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            padding: '12px 0', 
                            borderBottom: '1px solid #f8f8f8',
                            transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <div style={{ flex: 1 }}>
                                <strong style={{ color: '#34495e', display: 'block', marginBottom: '4px' }}>{p.name}</strong> 
                                <span style={{ color: '#7f8c8d', fontSize: '0.85em', display: 'block' }}>
                                    {p.category_name && `Category: ${p.category_name} • `}
                                    Batch: {p.batch_no || 'N/A'} • 
                                    Qty: <strong>{p.quantity}</strong> • 
                                    Price: <strong>{formatPrice(p.retail_price)}</strong>
                                </span>
                            </div>
                            <button 
                                className="button small-button" 
                                onClick={() => addToCart(p)}
                                disabled={p.quantity <= 0}
                                style={{ 
                                    background: p.quantity <= 0 ? '#bdc3c7' : '#2a9d8f',
                                    fontWeight: 'bold',
                                    minWidth: '60px'
                                }}
                                title={p.quantity <= 0 ? 'Out of stock' : `Add ${p.name} to bill`}
                            >
                                {p.quantity <= 0 ? 'Out of Stock' : 'Add'}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
      </div>

      {/* Right Side: Billing Cart & Summary */}
      <div style={{ flex: 3, minWidth: 400 }}>
        {/* Customer Information */}
        <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginTop: 0, marginBottom: 15 }}>Customer Information</h3>

            <div style={{ display: 'flex', marginBottom: 15, gap: 10 }}>
                <button 
                    className="button small-button"
                    onClick={() => setCustomerSelectionType('existing')}
                    style={{ 
                      background: customerSelectionType === 'existing' ? '#2980b9' : '#bdc3c7', 
                      flex: 1,
                      fontWeight: 'bold'
                    }}
                >
                    Select Existing Customer
                </button>
                <button 
                    className="button small-button"
                    onClick={() => setCustomerSelectionType('new')}
                    style={{ 
                      background: customerSelectionType === 'new' ? '#2980b9' : '#bdc3c7', 
                      flex: 1,
                      fontWeight: 'bold'
                    }}
                >
                    Enter Customer Name
                </button>
            </div>

            {customerSelectionType === 'existing' ? (
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#555' }}>
                        Select Customer:
                    </label>
                    <select
                        className="input"
                        value={selectedCustomer}
                        onChange={(e) => setSelectedCustomer(e.target.value)}
                        style={{ width: '100%' }}
                        disabled={customers.length === 0}
                    >
                        {customers.length === 0 ? (
                            <option value="">-- No customers available --</option>
                        ) : (
                            <>
                                <option value="">-- Select a customer --</option>
                                {customers.map(c => (
                                    <option key={c.id} value={c.id.toString()}>
                                        {c.name} {c.contact_email ? `(${c.contact_email})` : ''}
                                    </option>
                                ))}
                            </>
                        )}
                    </select>
                    {customers.length === 0 && (
                        <p style={{ color: '#e74c3c', fontSize: '0.9em', marginTop: '8px' }}>
                            No customers found. Switch to "Enter Customer Name" to proceed.
                        </p>
                    )}
                </div>
            ) : (
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#555' }}>
                        Customer Name:
                    </label>
                    <input
                        className="input"
                        type="text"
                        placeholder="Enter customer name (required)"
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                        style={{ width: '100%' }}
                    />
                </div>
            )}
        </div>

        {/* Cart/Line Items */}
        <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginTop: 0, marginBottom: 15 }}>
                Bill Items {cart.length > 0 && `(${cart.length})`}
            </h3>
            
            {cart.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#95a5a6', padding: '30px' }}>
                    <p style={{ marginBottom: '10px' }}>No products added to the bill.</p>
                    <p style={{ fontSize: '0.9em' }}>Add products from the left panel to create a bill.</p>
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: '500px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8f9fa' }}>
                                <th style={{ textAlign: 'left', padding: '12px 8px', width: '35%', borderBottom: '2px solid #dee2e6' }}>Product</th>
                                <th style={{ padding: '12px 8px', width: '15%', borderBottom: '2px solid #dee2e6' }}>Price (₹)</th>
                                <th style={{ padding: '12px 8px', width: '15%', borderBottom: '2px solid #dee2e6' }}>Quantity</th>
                                <th style={{ padding: '12px 8px', width: '20%', borderBottom: '2px solid #dee2e6' }}>Subtotal</th>
                                <th style={{ padding: '12px 8px', width: '15%', borderBottom: '2px solid #dee2e6' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cart.map(item => (
                                <tr key={item.product_id} style={{ borderBottom: '1px solid #f1f1f1' }}>
                                    <td style={{ textAlign: 'left', padding: '12px 8px', fontSize: '0.9em', verticalAlign: 'top' }}>
                                        <div>
                                            <strong style={{ color: '#34495e' }}>{item.name}</strong>
                                            {item.batch_no && (
                                                <div style={{ fontSize: '0.8em', color: '#7f8c8d', marginTop: '2px' }}>
                                                    Batch: {item.batch_no}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px 8px', verticalAlign: 'top' }}>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={item.unit_price}
                                            onChange={(e) => handleCartItemChange(item.product_id, 'unit_price', e.target.value)}
                                            className="input small-input"
                                            style={{ width: '80px', textAlign: 'center' }}
                                        />
                                    </td>
                                    <td style={{ padding: '12px 8px', verticalAlign: 'top' }}>
                                        <input
                                            type="number"
                                            min="1"
                                            max={item.available_quantity}
                                            value={item.quantity_sold}
                                            onChange={(e) => handleCartItemChange(item.product_id, 'quantity_sold', e.target.value)}
                                            className="input small-input"
                                            style={{ width: '70px', textAlign: 'center' }}
                                        />
                                        <div style={{ fontSize: '0.8em', color: '#7f8c8d', marginTop: '4px' }}>
                                            Max: {item.available_quantity}
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px 8px', fontWeight: 'bold', verticalAlign: 'top' }}>
                                        {formatINR((item.quantity_sold * item.unit_price) || 0)}
                                    </td>
                                    <td style={{ padding: '12px 8px', verticalAlign: 'top' }}>
                                        <button 
                                            className="button small-button" 
                                            style={{ 
                                                background: '#e74c3c',
                                                padding: '6px 12px',
                                                fontSize: '12px'
                                            }}
                                            onClick={() => removeFromCart(item.product_id)}
                                            title={`Remove ${item.name} from bill`}
                                        >
                                            Remove
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>

        {/* Summary & Finalize */}
        <div className="card">
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: 20,
                padding: '15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #e9ecef'
            }}>
                <h3 style={{ margin: 0, color: '#495057' }}>Total Amount:</h3>
                <h3 style={{ margin: 0, color: '#27ae60', fontSize: '1.5em' }}>
                    {formatINR(totalAmount)}
                </h3>
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
                <button
                    className="button"
                    onClick={() => {
                        setCart([]);
                        setNewCustomerName("");
                        setSelectedCustomer(customers.length > 0 ? customers[0].id.toString() : "");
                    }}
                    disabled={cart.length === 0}
                    style={{ 
                        flex: 1, 
                        background: '#6c757d',
                        fontWeight: 'bold'
                    }}
                >
                    Clear Bill
                </button>
                <button
                    className="button"
                    onClick={processBill}
                    disabled={
                        cart.length === 0 || 
                        loading || 
                        (customerSelectionType === 'new' && !newCustomerName.trim()) ||
                        (customerSelectionType === 'existing' && !selectedCustomer)
                    }
                    style={{ 
                        flex: 2, 
                        background: '#27ae60', 
                        fontWeight: 'bold',
                        fontSize: '1.1em'
                    }}
                >
                    {loading ? (
                        <span>
                            <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                            Processing...
                        </span>
                    ) : (
                        `Process Bill - ${formatINR(totalAmount)}`
                    )}
                </button>
            </div>
            
            {(customerSelectionType === 'new' && !newCustomerName.trim()) && (
                <p style={{ color: '#e74c3c', fontSize: '0.9em', marginTop: '10px', textAlign: 'center' }}>
                    Please enter a customer name to proceed.
                </p>
            )}
            {(customerSelectionType === 'existing' && !selectedCustomer) && (
                <p style={{ color: '#e74c3c', fontSize: '0.9em', marginTop: '10px', textAlign: 'center' }}>
                    Please select a customer to proceed.
                </p>
            )}
        </div>
      </div>
   
      {/* Modal for messages */}
      {isModalOpen && (
          <div className="modal-overlay">
              <div className="modal-content" style={{ 
                  borderColor: modalType === 'error' ? '#e74c3c' : (modalType === 'success' ? '#27ae60' : '#3498db'),
                  maxWidth: '500px'
              }}>
                  <h4 style={{ 
                      color: modalType === 'error' ? '#e74c3c' : (modalType === 'success' ? '#27ae60' : '#3498db'),
                      marginBottom: '15px'
                  }}>
                    {modalType.charAt(0).toUpperCase() + modalType.slice(1)}
                  </h4>
                  <p style={{ marginBottom: '20px', lineHeight: '1.5' }}>{modalMessage}</p>
                  <button 
                      className="button" 
                      onClick={closeModal} 
                      style={{ 
                          background: modalType === 'error' ? '#e74c3c' : '#3498db',
                          width: '100%'
                      }}
                  >
                    Close
                  </button>
              </div>
          </div>
      )}
    </div>
  );
}

export default Billing;