// src/components/ProductList.js
import React, { useState } from 'react';
import './App.css';

const ProductList = ({ products, onDelete, onAddProduct }) => {
  const [filter, setFilter] = useState('all');

  const filteredProducts = products.filter(product => {
    const days = getDaysUntilExpiry(product.expiry_date);
    if (filter === 'expiring') return days <= 7 && days >= 0;
    if (filter === 'expired') return days < 0;
    if (filter === 'good') return days > 7;
    return true;
  });

  function getDaysUntilExpiry(expiryDate) {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  return (
    <div className="fade-in">
      <div className="product-list-header">
        <h1>🏪 Product Inventory</h1>
        <button className="button primary pulse" onClick={onAddProduct}>
          📷 Scan New Product
        </button>
      </div>

      {/* Enhanced Filter Buttons */}
      <div className="filter-buttons">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({products.length})
        </button>
        <button 
          className={`filter-btn ${filter === 'good' ? 'active' : ''}`}
          onClick={() => setFilter('good')}
        >
          ✅ Good ({products.filter(p => getDaysUntilExpiry(p.expiry_date) > 7).length})
        </button>
        <button 
          className={`filter-btn ${filter === 'expiring' ? 'active' : ''}`}
          onClick={() => setFilter('expiring')}
        >
          ⚠️ Expiring Soon ({products.filter(p => {
            const days = getDaysUntilExpiry(p.expiry_date);
            return days <= 7 && days >= 0;
          }).length})
        </button>
        <button 
          className={`filter-btn ${filter === 'expired' ? 'active' : ''}`}
          onClick={() => setFilter('expired')}
        >
          ❌ Expired ({products.filter(p => getDaysUntilExpiry(p.expiry_date) < 0).length})
        </button>
      </div>

      {/* Enhanced Products Grid */}
      {filteredProducts.length > 0 ? (
        <div className="products-grid enhanced">
          {filteredProducts.map(product => (
            <ProductCard key={product.id} product={product} onDelete={onDelete} />
          ))}
        </div>
      ) : (
        <div className="empty-state enhanced">
          <div className="empty-icon">🔍</div>
          <h3>No products found</h3>
          <p>Try changing your filter or scan a new product</p>
          <button 
            className="button primary"
            onClick={onAddProduct}
          >
            Scan New Product
          </button>
        </div>
      )}
    </div>
  );
};

// Enhanced Product Card Component
const ProductCard = ({ product, onDelete }) => {
  const getDaysUntilExpiry = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysUntilExpiry = getDaysUntilExpiry(product.expiry_date);
  
  const getExpiryStatus = () => {
    if (daysUntilExpiry < 0) return 'Expired';
    if (daysUntilExpiry <= 7) return 'Expiring';
    return 'good';
  };

  const status = getExpiryStatus();
  
  return (
    <div className={`product-card enhanced ${status}`}>
      <div className="product-header">
        <div className="product-info">
          <div className="product-name">{product.name}</div>
          {product.batch_no && (
            <div className="product-batch">
              <span className="batch-icon">🏷️</span>
              Batch: {product.batch_no}
            </div>
          )}
        </div>
        <div className={`product-expiry enhanced expiry-${status}`}>
          {daysUntilExpiry < 0 ? '🚫 Expired' : 
           daysUntilExpiry === 0 ? '⚠️ Today' : 
           daysUntilExpiry <= 7 ? `⏳ ${daysUntilExpiry}d` : 
           `✅ ${daysUntilExpiry}d`}
        </div>
      </div>
      
      <div className="product-details enhanced">
        <div className="detail-item">
          <span className="detail-icon">📅</span>
          <strong>Expires:</strong> 
          {new Date(product.expiry_date).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
        
        {product.manufactured_date && (
          <div className="detail-item">
            <span className="detail-icon">🏭</span>
            <strong>Made:</strong> {new Date(product.manufactured_date).toLocaleDateString()}
          </div>
        )}
        
        {product.price && (
          <div className="detail-item">
            <span className="detail-icon">💰</span>
            <strong>Price:</strong> ${product.price}
          </div>
        )}
      </div>
      
      <div className="product-actions enhanced">
        <button 
          className="button outline delete-btn"
          onClick={() => onDelete(product.id)}
        >
          🗑️ Remove Product
        </button>
      </div>
    </div>
  );
};

export default ProductList;