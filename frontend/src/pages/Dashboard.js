// src/pages/Dashboard.js
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import '../App.css';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    stats: {},
    recentActivity: [],
    products: [],
    lastUpdated: ''
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [editingProduct, setEditingProduct] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: '',
    location: '',
    quantity: '',
    minStock: '',
    retailPrice: '',
    costPrice: '',
    expiryDate: '',
    sku: '',
    supplier: '',
    barcode: ''
  });

  const [loading, setLoading] = useState(true);
  const [notificationStatus, setNotificationStatus] = useState('ready');
  const navigate = useNavigate();

  const userRole = localStorage.getItem("user_role_id");
  const isAdmin = userRole === "1";

  // Fetch products from database
  const fetchProductsFromDatabase = async () => {
    try {
      setLoading(true);
      const response = await api.get("/products/dashboard");
      const products = response.data;
      
      // Calculate stats based on fetched products
      const stats = calculateStats(products);
      
      setDashboardData(prev => ({
        ...prev,
        products: products,
        stats: stats,
        lastUpdated: new Date().toLocaleTimeString()
      }));
    } catch (error) {
      console.error("Failed to fetch products:", error);
      // Fallback to local data if API fails
      initializeWithSampleData();
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats from products
  const calculateStats = (products) => {
    let healthy = 0;
    let expiring = 0;
    let expired = 0;
    let lowStock = 0;
    let totalProfitPotential = 0;
    let totalCostValue = 0;
    let totalRetailValue = 0;

    products.forEach(product => {
      const retail = parseFloat(product.retail_price) || 0;
      const cost = parseFloat(product.cost_price) || 0;
      const quantity = parseInt(product.quantity, 10) || 0;

      totalProfitPotential += quantity * (retail - cost);
      totalCostValue += quantity * cost;
      totalRetailValue += quantity * retail;

      const status = getStatusClass(product.expiry_date, product.expiry_threshold_days);

      if (status === "status-error") {
        expired++;
      } else if (status === "status-warning") {
        expiring++;
      } else {
        healthy++;
      }

      if (quantity <= 5) {
        lowStock++;
      }
    });

    const avgProfitMargin = totalRetailValue > 0 ? ((totalRetailValue - totalCostValue) / totalRetailValue) * 100 : 0;

    return {
      profitPotential: totalProfitPotential,
      totalProducts: products.length,
      healthyStock: healthy,
      expiringItems: expiring,
      expiredItems: expired,
      lowStock: lowStock,
      totalCostValue: totalCostValue,
      totalRetailValue: totalRetailValue,
      avgProfitMargin: avgProfitMargin
    };
  };

  // Initialize with sample data if database is not available
  const initializeWithSampleData = () => {
    const sampleProducts = [
      {
        id: 1,
        name: 'Premium Olive Oil',
        category_name: 'Cooking',
        location_name: 'Aisle 3',
        quantity: 25,
        retail_price: 450,
        cost_price: 320,
        expiry_date: '2024-12-31',
        batch_no: 'BATCH001',
        expiry_threshold_days: 30
      },
      {
        id: 2,
        name: 'Organic Honey',
        category_name: 'Sweeteners',
        location_name: 'Aisle 2',
        quantity: 8,
        retail_price: 280,
        cost_price: 190,
        expiry_date: '2024-06-15',
        batch_no: 'BATCH002',
        expiry_threshold_days: 30
      }
    ];

    const stats = calculateStats(sampleProducts);

    setDashboardData({
      stats: stats,
      recentActivity: [
        { id: 1, type: 'success', icon: '📦', title: 'Product Added', description: 'Premium Olive Oil added to inventory', time: '2 minutes ago' },
        { id: 2, type: 'info', icon: '💰', title: 'Sale Completed', description: 'Bill #2456 processed successfully', time: '15 minutes ago' },
      ],
      products: sampleProducts,
      lastUpdated: new Date().toLocaleTimeString()
    });
  };

  // Load data on component mount
  useEffect(() => {
    fetchProductsFromDatabase();
  }, []);

  // Format currency in Indian Rupees
  const formatINR = (amount) => {
    if (!amount || isNaN(amount)) return '₹0.00';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const calculateProfitMargin = (costPrice, retailPrice) => {
    if (!costPrice || !retailPrice || costPrice === 0) return 0;
    return ((retailPrice - costPrice) / retailPrice) * 100;
  };

  const getStatusClass = (expiryDateString, thresholdDays = 30) => {
    if (!expiryDateString) return "status-success";
    
    const today = new Date();
    const expiryDate = new Date(expiryDateString);
    const diffTime = expiryDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const effectiveThreshold = thresholdDays > 0 ? thresholdDays : 30;

    if (diffDays <= 0) return "status-error";
    if (diffDays <= effectiveThreshold) return "status-warning";
    return "status-success";
  };

  const refreshData = () => {
    fetchProductsFromDatabase();
    setNotificationStatus('success');
    setTimeout(() => setNotificationStatus('ready'), 3000);
  };

  const sendNotification = async (subject, message) => {
    setNotificationStatus('sending');
    
    console.log(`🔔 NOTIFICATION: ${subject}\n${message}`);
    
    // Add to recent activity
    const newActivity = {
      id: Date.now(),
      type: 'success',
      icon: '📦',
      title: subject,
      description: message,
      time: 'Just now'
    };
    
    setDashboardData(prev => ({
      ...prev,
      recentActivity: [newActivity, ...prev.recentActivity.slice(0, 4)]
    }));

    setNotificationStatus('success');
    setTimeout(() => setNotificationStatus('ready'), 3000);
  };

  const handleManualExpiryCheck = async () => {
    if (!isAdmin) {
      alert("Permission Denied: Only Administrators can manually trigger expiry checks.");
      return;
    }
    
    if (!window.confirm("Are you sure you want to manually trigger the Expiry Alert Check?")) {
      return;
    }

    setNotificationStatus('sending');

    try {
      const expiringProducts = dashboardData.products.filter(product => {
        const status = getStatusClass(product.expiry_date, product.expiry_threshold_days);
        return status === "status-warning" || status === "status-error";
      });

      if (expiringProducts.length > 0) {
        await sendNotification(
          'Expiry Alert',
          `${expiringProducts.length} products need attention`
        );
      } else {
        await sendNotification(
          'All Products Healthy',
          'No expiring products found'
        );
      }
    } catch (error) {
      console.error('Notification Error:', error);
      setNotificationStatus('error');
      setTimeout(() => setNotificationStatus('ready'), 3000);
    }
  };

  const categories = ['all', 'Dairy', 'Beverages', 'Snacks', 'Frozen', 'Produce', 'Bakery', 'Cooking', 'Sweeteners'];

  // Filter and sort products
  const filteredProducts = dashboardData.products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.batch_no && product.batch_no.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || product.category_name === categoryFilter;
    
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];
    
    if (sortBy === 'expiry_date') {
      aValue = new Date(aValue);
      bValue = new Date(bValue);
    }
    
    if (sortBy === 'quantity' || sortBy === 'retail_price' || sortBy === 'cost_price') {
      aValue = parseFloat(aValue);
      bValue = parseFloat(bValue);
    }
    
    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const handleDeleteClick = async (product) => {
    if (window.confirm(`Are you sure you want to delete "${product.name}"?`)) {
      try {
        await api.delete(`/products/${product.id}`);
        // Refresh data from database after deletion
        await fetchProductsFromDatabase();
        await sendNotification(
          'Product Deleted',
          `Product "${product.name}" has been removed from inventory.`
        );
      } catch (error) {
        console.error('Delete failed:', error);
        alert('Failed to delete product from database');
      }
    }
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.quantity) {
      alert('Please fill in at least product name and quantity');
      return;
    }

    try {
      // Send product to database
      const productData = {
        name: newProduct.name,
        category_name: newProduct.category,
        location_name: newProduct.location,
        quantity: parseInt(newProduct.quantity) || 0,
        retail_price: parseFloat(newProduct.retailPrice) || 0,
        cost_price: parseFloat(newProduct.costPrice) || 0,
        expiry_date: newProduct.expiryDate,
        batch_no: newProduct.sku || `BATCH${Date.now()}`,
        expiry_threshold_days: 30
      };

      await api.post("/products", productData);
      
      // Refresh data from database after adding
      await fetchProductsFromDatabase();
      
      // Send notification
      await sendNotification(
        'Product Added',
        `"${newProduct.name}" has been added to inventory successfully.`
      );
      
      // Reset form and close
      setNewProduct({
        name: '',
        category: '',
        location: '',
        quantity: '',
        minStock: '',
        retailPrice: '',
        costPrice: '',
        expiryDate: '',
        sku: '',
        supplier: '',
        barcode: ''
      });
      setShowAddForm(false);
    } catch (error) {
      console.error('Failed to add product:', error);
      alert('Failed to add product to database');
    }
  };

  const handleNewProductChange = (e) => {
    const { name, value } = e.target;
    setNewProduct(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-state">
          <div className="loading-spinner large"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header Section */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1 className="dashboard-title">SmartExpiry Dashboard</h1>
          <p className="dashboard-subtitle">
            Real-time inventory management with expiry tracking
          </p>
        </div>
        <div className="header-stats">
          <div className="last-updated">
            Last updated: {dashboardData.lastUpdated}
            {notificationStatus === 'sending' && ' • 🔄 Sending...'}
            {notificationStatus === 'success' && ' • ✅ Notification Sent'}
          </div>
          <button className="refresh-btn" onClick={refreshData}>
            <span>🔄</span>
            REFRESH DATA
          </button>
        </div>
      </div>

      {/* Expiry Status Guide */}
      <div className="status-legend-section">
        <div className="legend-header">
          <h2 className="legend-title">Expiry Status Guide</h2>
          <p className="legend-subtitle">Understanding your product expiry status indicators</p>
        </div>
        <div className="expiry-legend-grid">
          <div className="expiry-legend-item">
            <div className="expiry-status-badge healthy">🟢 Healthy</div>
            <div className="expiry-legend-content">
              <div className="expiry-legend-description">Products with good expiry dates</div>
              <div className="expiry-legend-details">More than 30 days remaining</div>
            </div>
          </div>
          <div className="expiry-legend-item">
            <div className="expiry-status-badge expiring"> 🟡 Expiring Soon</div>
            <div className="expiry-legend-content">
              <div className="expiry-legend-description">Products expiring soon</div>
              <div className="expiry-legend-details">Within 30 days or less</div>
            </div>
          </div>
          <div className="expiry-legend-item">
            <div className="expiry-status-badge expired">🔴 Expired</div>
            <div className="expiry-legend-content">
              <div className="expiry-legend-description">Products that have expired</div>
              <div className="expiry-legend-details">Post expiry date</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions-section">
        <div className="actions-header">
          <h3 className="actions-title">Quick Actions</h3>
          <div className="frequently-used-badge">
            <span>⚡</span>
            FREQUENTLY USED
          </div>
        </div>
        <div className="actions-grid">
          <button 
            className="action-card action-card-new-bill"
            onClick={() => navigate('/billing')}
          >
            <span className="action-icon">🧾</span>
            <div className="action-content">
              <div className="action-title">New Sale</div>
              <div className="action-description">Create new bill</div>
            </div>
          </button>
          <button 
            className="action-card action-card-add-product" 
            onClick={() => navigate('/add-product')}
          >
            <span className="action-icon">📦</span>
            <div className="action-content">
              <div className="action-title">Add Product</div>
              <div className="action-description">Add new inventory</div>
            </div>
          </button>
          <button 
            className="action-card action-card-reports"
            onClick={() => navigate('/reports')}
          >
            <span className="action-icon">📊</span>
            <div className="action-content">
              <div className="action-title">Reports</div>
              <div className="action-description">View analytics</div>
            </div>
          </button>
          <button 
            className="action-card action-card-expiry"
            onClick={handleManualExpiryCheck}
          >
            <span className="action-icon">⏰</span>
            <div className="action-content">
              <div className="action-title">Check Expiry</div>
              <div className="action-description">Monitor dates</div>
            </div>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid-three">
        <div className="stat-card stat-profit">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div>
              <div className="stat-value">{formatINR(dashboardData.stats.profitPotential)}</div>
              <div className="stat-label">Profit Potential</div>
            </div>
            <div className="stat-trend positive">
              <span>↑</span>
              8.2%
            </div>
          </div>
        </div>

        <div className="stat-card stat-products">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <div>
              <div className="stat-value">{dashboardData.stats.totalProducts}</div>
              <div className="stat-label">Total Products</div>
            </div>
            <div className="stat-trend positive">
              <span>↑</span>
              5.1%
            </div>
          </div>
        </div>

        <div className="stat-card stat-healthy">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div>
              <div className="stat-value">{dashboardData.stats.healthyStock}</div>
              <div className="stat-label">Healthy Stock</div>
            </div>
            <div className="stat-trend positive">
              <span>↑</span>
              12.4%
            </div>
          </div>
        </div>

        <div className="stat-card stat-expiring">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <div>
              <div className="stat-value">{dashboardData.stats.expiringItems}</div>
              <div className="stat-label">Expiring Soon</div>
            </div>
            <div className="stat-trend negative">
              <span>↓</span>
              3.2%
            </div>
          </div>
        </div>

        <div className="stat-card stat-expired">
          <div className="stat-icon">❌</div>
          <div className="stat-content">
            <div>
              <div className="stat-value">{dashboardData.stats.expiredItems}</div>
              <div className="stat-label">Expired Items</div>
            </div>
            <div className="stat-trend negative">
              <span>↓</span>
              15.7%
            </div>
          </div>
        </div>

        <div className="stat-card stat-low-stock">
          <div className="stat-icon">📉</div>
          <div className="stat-content">
            <div>
              <div className="stat-value">{dashboardData.stats.lowStock}</div>
              <div className="stat-label">Low Stock Items</div>
            </div>
            <div className="stat-trend negative">
              <span>↓</span>
              2.1%
            </div>
          </div>
        </div>
      </div>

      {/* Product Inventory Section */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Product Inventory</h2>
            <p className="card-subtitle">{dashboardData.products.length} items in stock • Last updated: {dashboardData.lastUpdated}</p>
          </div>
          <button 
            className="btn btn-outline btn-sm"
            onClick={refreshData}
          >
            <span>🔄</span>
            Refresh
          </button>
        </div>

        {dashboardData.products.length === 0 ? (
          <div className="text-center" style={{ padding: '3rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.5 }}>📦</div>
            <h3 style={{ color: '#666', marginBottom: '0.5rem' }}>No Products Found</h3>
            <p style={{ color: '#666', marginBottom: '2rem' }}>
              Start by adding your first product to the inventory.
            </p>
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/add-product')}
            >
              <span>➕</span>
              Add First Product
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Location</th>
                  <th>Qty</th>
                  <th>Retail Price</th>
                  <th>Cost Price</th>
                  <th>Expiry Date</th>
                  <th>Status</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {dashboardData.products.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div>
                        <strong style={{ color: '#333' }}>{p.name}</strong>
                        {p.batch_no && (
                          <div style={{ fontSize: '0.8rem', color: '#666' }}>
                            Batch: {p.batch_no}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>{p.category_name || 'N/A'}</td>
                    <td>{p.location_name || 'N/A'}</td>
                    <td>
                      <span className={`status ${p.quantity > 10 ? 'status-success' : p.quantity > 0 ? 'status-warning' : 'status-error'}`}>
                        <span className="status-dot"></span>
                        {p.quantity}
                      </span>
                    </td>
                    <td style={{ fontWeight: '600', color: '#10b981' }}>
                      {formatINR(p.retail_price)}
                    </td>
                    <td style={{ color: '#666' }}>
                      {formatINR(p.cost_price)}
                    </td>
                    <td>{formatDate(p.expiry_date)}</td>
                    <td>
                      <span className={`status ${getStatusClass(p.expiry_date, p.expiry_threshold_days)}`}>
                        <span className="status-dot"></span>
                        {getStatusClass(p.expiry_date, p.expiry_threshold_days).replace('status-', '')}
                      </span>
                    </td>
                    {isAdmin && (
                      <td>
                        <button 
                          className="btn btn-error btn-sm"
                          onClick={() => handleDeleteClick(p)}
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="activity-section">
        <div className="activity-header">
          <h3 className="section-title">Recent Activity</h3>
          <div className="live-indicator">
            <span className="live-dot"></span>
            LIVE
          </div>
        </div>
        <div className="activity-list">
          {dashboardData.recentActivity.map(activity => (
            <div key={activity.id} className={`activity-item activity-${activity.type}`}>
              <span className="activity-icon">{activity.icon}</span>
              <div className="activity-content">
                <div className="activity-title">{activity.title}</div>
                <div className="activity-description">{activity.description}</div>
                <div className="activity-meta">
                  <span className="activity-time">{activity.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Status */}
      <div className="status-section">
        <h3 className="section-title">System Status</h3>
        <div className="status-list">
          <div className="status-item">
            <div className="status-info">
              <span className="status-dot online"></span>
              <span>Database Connection</span>
            </div>
            <span className="status-value online">Online</span>
          </div>
          <div className="status-item">
            <div className="status-info">
              <span className="status-dot active"></span>
              <span>Inventory Sync</span>
            </div>
            <span className="status-value active">Active</span>
          </div>
          <div className="status-item">
            <div className="status-info">
              <span className="status-dot sync"></span>
              <span>Last Updated</span>
            </div>
            <span className="status-value sync">{dashboardData.lastUpdated}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;