// src/components/DashboardStats.js
import React from 'react';

const DashboardStats = ({ report, productsCount }) => {
  const formatINR = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return '₹0.00';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const stats = [
    {
      icon: '💰',
      value: formatINR(report.total_profit_potential),
      label: 'Profit Potential',
      change: { value: 8.2, trend: 'positive' },
      description: 'Total potential profit across inventory'
    },
    {
      icon: '📦',
      value: productsCount.toLocaleString(),
      label: 'Total Products',
      change: { value: 5.1, trend: 'positive' },
      description: 'Active products in inventory'
    },
    {
      icon: '✅',
      value: report.healthy.toLocaleString(),
      label: 'Healthy Stock',
      change: { value: 12.4, trend: 'positive' },
      description: 'Products with good expiry status'
    },
    {
      icon: '⚠️',
      value: report.expiring.toLocaleString(),
      label: 'Expiring Soon',
      change: { value: 3.2, trend: 'negative' },
      description: 'Products expiring within threshold'
    },
    {
      icon: '❌',
      value: report.expired.toLocaleString(),
      label: 'Expired Items',
      change: { value: 15.7, trend: 'negative' },
      description: 'Products past expiry date'
    },
    {
      icon: '📉',
      value: report.low_stock.toLocaleString(),
      label: 'Low Stock',
      change: { value: 2.1, trend: 'negative' },
      description: 'Products with critical stock levels'
    }
  ];

  return (
    <div className="analytics-grid">
      {stats.map((stat, index) => (
        <div key={index} className="analytics-card">
          <div className="analytics-card-header">
            <div className="analytics-icon">{stat.icon}</div>
            <div className={`trend-indicator ${stat.change.trend}`}>
              {stat.change.trend === 'positive' ? '↑' : '↓'}
              {Math.abs(stat.change.value)}%
            </div>
          </div>
          <div className="analytics-content">
            <div className="analytics-value">{stat.value}</div>
            <div className="analytics-label">{stat.label}</div>
            <div className="analytics-description">{stat.description}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DashboardStats;