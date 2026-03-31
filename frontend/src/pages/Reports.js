// src/pages/Reports.js - Complete with 2 Grids in One Line
import React, { useState } from 'react';
import '../App.css';

function Reports() {
  const [timeRange, setTimeRange] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  // Mock data - replace with actual API calls
  const analyticsData = {
    monthly_revenue: 3125000.00,
    total_sales: 2456,
    top_products_count: 15,
    customer_growth: 12,
    active_products: 89,
    expiring_soon: 8,
    performance: {
      daily_target: 85,
      weekly_target: 72,
      monthly_target: 65
    },
    inventory_health: {
      optimal_stock: 74,
      low_stock: 12,
      out_of_stock: 3,
      overstock: 11
    }
  };

  // Show notification
  const showNotification = (message, type = 'info') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 3000);
  };

  const formatINR = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return '₹0.00';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Generate DOCX content as HTML that can be converted to Word
  const generateDOCXContent = () => {
    const currentDate = new Date().toLocaleDateString();
    
    return `
      <!DOCTYPE html>
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>SmartExpiry Analytics Report</title>
        <style>
          @page {
            size: A4;
            margin: 2cm;
          }
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 20px;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #2c5aa0;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            color: #2c5aa0;
            margin: 0;
            font-size: 28px;
          }
          .header .subtitle {
            color: #666;
            font-size: 16px;
            margin: 5px 0;
          }
          .section {
            margin-bottom: 25px;
          }
          .section h2 {
            color: #2c5aa0;
            border-bottom: 1px solid #ddd;
            padding-bottom: 8px;
            margin-bottom: 15px;
            font-size: 20px;
          }
          .metrics-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-bottom: 20px;
          }
          .metric-card {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 15px;
            background: #f9f9f9;
          }
          .metric-value {
            font-size: 24px;
            font-weight: bold;
            color: #2c5aa0;
            margin: 0;
          }
          .metric-label {
            font-size: 14px;
            color: #666;
            margin: 5px 0 0 0;
          }
          .metric-change {
            font-size: 12px;
            margin-top: 5px;
          }
          .positive {
            color: #2ecc71;
          }
          .negative {
            color: #e74c3c;
          }
          .progress-section, .inventory-section {
            margin-bottom: 20px;
          }
          .progress-item, .inventory-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            padding: 8px;
            background: #f8f9fa;
            border-radius: 4px;
          }
          .progress-bar {
            width: 200px;
            height: 20px;
            background: #ecf0f1;
            border-radius: 10px;
            overflow: hidden;
          }
          .progress-fill {
            height: 100%;
            background: #3498db;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
          }
          th {
            background: #2c5aa0;
            color: white;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            color: #666;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>SmartExpiry Analytics Report</h1>
          <div class="subtitle">Comprehensive insights into your inventory performance</div>
          <div class="subtitle">Generated on: ${currentDate} | Period: ${timeRange}</div>
        </div>

        <div class="section">
          <h2>Key Performance Metrics</h2>
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-value">${formatINR(analyticsData.monthly_revenue)}</div>
              <div class="metric-label">Monthly Revenue</div>
              <div class="metric-change positive">↑ 18.2% growth</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${analyticsData.total_sales.toLocaleString()}</div>
              <div class="metric-label">Total Sales</div>
              <div class="metric-change positive">↑ 8.7% growth</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${analyticsData.top_products_count}</div>
              <div class="metric-label">Top Products</div>
              <div class="metric-change positive">↑ 22.1% growth</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">+${analyticsData.customer_growth}</div>
              <div class="metric-label">Customer Growth</div>
              <div class="metric-change positive">↑ 8.3% growth</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${analyticsData.active_products}</div>
              <div class="metric-label">Active Products</div>
              <div class="metric-change positive">↑ 3.2% growth</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${analyticsData.expiring_soon}</div>
              <div class="metric-label">Expiring Soon</div>
              <div class="metric-change negative">↓ 12.4% decrease</div>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>Performance Overview</h2>
          <div class="progress-section">
            <h3>Sales Performance Targets</h3>
            <table>
              <thead>
                <tr>
                  <th>Target</th>
                  <th>Achievement</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Daily Target</td>
                  <td>${analyticsData.performance.daily_target}%</td>
                  <td>
                    <div class="progress-bar">
                      <div class="progress-fill" style="width: ${analyticsData.performance.daily_target}%"></div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>Weekly Target</td>
                  <td>${analyticsData.performance.weekly_target}%</td>
                  <td>
                    <div class="progress-bar">
                      <div class="progress-fill" style="width: ${analyticsData.performance.weekly_target}%"></div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>Monthly Target</td>
                  <td>${analyticsData.performance.monthly_target}%</td>
                  <td>
                    <div class="progress-bar">
                      <div class="progress-fill" style="width: ${analyticsData.performance.monthly_target}%"></div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="section">
          <h2>Inventory Health Analysis</h2>
          <div class="inventory-section">
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Percentage</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Optimal Stock</td>
                  <td>${analyticsData.inventory_health.optimal_stock}%</td>
                  <td style="color: #2ecc71;">Excellent</td>
                </tr>
                <tr>
                  <td>Low Stock</td>
                  <td>${analyticsData.inventory_health.low_stock}%</td>
                  <td style="color: #f39c12;">Needs Attention</td>
                </tr>
                <tr>
                  <td>Out of Stock</td>
                  <td>${analyticsData.inventory_health.out_of_stock}%</td>
                  <td style="color: #e74c3c;">Critical</td>
                </tr>
                <tr>
                  <td>Overstock</td>
                  <td>${analyticsData.inventory_health.overstock}%</td>
                  <td style="color: #9b59b6;">Monitor</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="section">
          <h2>Summary & Recommendations</h2>
          <ul>
            <li><strong>Revenue Performance:</strong> Strong growth of 18.2% in monthly revenue indicates healthy business expansion.</li>
            <li><strong>Sales Volume:</strong> 2,456 total sales with 8.7% growth shows consistent market demand.</li>
            <li><strong>Product Performance:</strong> 15 top-performing products driving significant revenue.</li>
            <li><strong>Customer Base:</strong> 12 new customers acquired with 8.3% growth rate.</li>
            <li><strong>Inventory Status:</strong> 74% optimal stock level indicates good inventory management.</li>
            <li><strong>Attention Required:</strong> 8 products expiring soon need immediate action.</li>
          </ul>
        </div>

        <div class="footer">
          <p>Generated by SmartExpiry Analytics System</p>
          <p>Confidential - For Internal Use Only</p>
        </div>
      </body>
      </html>
    `;
  };

  // Export Report as DOCX
  const handleExportReport = () => {
    try {
      showNotification('Generating DOCX report...', 'info');
      
      // Generate the HTML content for DOCX
      const docxContent = generateDOCXContent();
      
      // Create a blob with the HTML content
      const blob = new Blob([docxContent], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `SmartExpiry_Report_${timeRange}_${new Date().toISOString().split('T')[0]}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showNotification('DOCX report downloaded successfully!', 'success');
      
    } catch (error) {
      console.error('Error generating DOCX report:', error);
      showNotification('Failed to generate report. Please try again.', 'error');
    }
  };

  // Print Summary functionality
  const handlePrintSummary = () => {
    showNotification('Preparing print layout...', 'info');
    
    const printContent = generateDOCXContent();
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  };

  // Email Report functionality
  const handleEmailReport = () => {
    showNotification('Preparing email...', 'info');
    
    const subject = `SmartExpiry Analytics Report - ${timeRange} - ${new Date().toLocaleDateString()}`;
    const body = `
Please find the attached SmartExpiry analytics report for the ${timeRange} period.

Key Highlights:
• Monthly Revenue: ${formatINR(analyticsData.monthly_revenue)}
• Total Sales: ${analyticsData.total_sales.toLocaleString()}
• Customer Growth: +${analyticsData.customer_growth}
• Active Products: ${analyticsData.active_products}

The detailed report is attached in DOCX format.

Best regards,
SmartExpiry System
    `.trim();
    
    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
  };

  return (
    <div className="reports-container">
      {/* Notification */}
      {notification.show && (
        <div className={`notification ${notification.type}`}>
          <span className="notification-message">{notification.message}</span>
          <button 
            className="notification-close"
            onClick={() => setNotification({ show: false, message: '', type: '' })}
          >
            ×
          </button>
        </div>
      )}

      {/* Header Section */}
      <div className="reports-header">
        <div className="header-content">
          <h1 className="main-title">SmartExpiry</h1>
          <div className="header-info">
            <h2 className="section-title">Analytics & Reports</h2>
            <p className="section-subtitle">Comprehensive insights into your inventory performance</p>
          </div>
        </div>
        
        <div className="time-filter">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="filter-select"
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
      </div>

      {/* MAIN CONTENT - 2 GRIDS IN ONE LINE */}
      <div className="main-content-grid">
        {/* Left Grid - Metrics Section */}
        <div className="metrics-section">
          {/* Top 3 Cards Grid */}
          <div className="top-metrics-grid">
            {/* Revenue Card */}
            <div className="metric-card">
              <div className="metric-header">
                <h3 className="metric-value">{formatINR(analyticsData.monthly_revenue)}</h3>
                <div className="metric-change positive">
                  <span className="change-arrow">↑</span>
                  <span className="change-percent">18.2%</span>
                </div>
              </div>
              <p className="metric-label">MONTHLY REVENUE</p>
            </div>

            {/* Total Sales Card */}
            <div className="metric-card">
              <div className="metric-header">
                <h3 className="metric-value">{analyticsData.total_sales.toLocaleString()}</h3>
                <div className="metric-change positive">
                  <span className="change-arrow">↑</span>
                  <span className="change-percent">8.7%</span>
                </div>
              </div>
              <p className="metric-label">TOTAL SALES</p>
            </div>

            {/* Top Products Card */}
            <div className="metric-card">
              <div className="metric-header">
                <h3 className="metric-value">{analyticsData.top_products_count}</h3>
                <div className="metric-change positive">
                  <span className="change-arrow">↑</span>
                  <span className="change-percent">22.1%</span>
                </div>
              </div>
              <p className="metric-label">TOP PRODUCTS</p>
            </div>
          </div>

          {/* Bottom 4 Cards Grid */}
          <div className="bottom-metrics-grid">
            {/* Customer Growth Card */}
            <div className="metric-card">
              <div className="metric-header">
                <h3 className="metric-value">+{analyticsData.customer_growth}</h3>
                <div className="metric-change positive">
                  <span className="change-arrow">↑</span>
                  <span className="change-percent">8.3%</span>
                </div>
              </div>
              <p className="metric-label">CUSTOMER GROWTH</p>
            </div>

            {/* Active Products Card */}
            <div className="metric-card">
              <div className="metric-header">
                <h3 className="metric-value">{analyticsData.active_products}</h3>
                <div className="metric-change positive">
                  <span className="change-arrow">↑</span>
                  <span className="change-percent">3.2%</span>
                </div>
              </div>
              <p className="metric-label">ACTIVE PRODUCTS</p>
            </div>

            {/* Expiring Soon Card */}
            <div className="metric-card">
              <div className="metric-header">
                <h3 className="metric-value">{analyticsData.expiring_soon}</h3>
                <div className="metric-change negative">
                  <span className="change-arrow">↓</span>
                  <span className="change-percent">12.4%</span>
                </div>
              </div>
              <p className="metric-label">EXPIRING SOON</p>
            </div>

            {/* Optimal Stock Card */}
            <div className="metric-card">
              <div className="metric-header">
                <h3 className="metric-value">{analyticsData.inventory_health.optimal_stock}%</h3>
                <div className="metric-change positive">
                  <span className="change-arrow">↑</span>
                  <span className="change-percent">5.1%</span>
                </div>
              </div>
              <p className="metric-label">OPTIMAL STOCK</p>
            </div>
          </div>
        </div>

        {/* Right Grid - Overview Section */}
        <div className="overview-section">
          <h3 className="overview-title">Performance Overview</h3>
          
          {/* Sales Performance */}
          <div className="performance-card">
            <h4 className="performance-subtitle">Sales Performance</h4>
            <div className="progress-grid">
              <div className="progress-item">
                <span className="progress-label">Daily Target</span>
                <div className="progress-bar-container">
                  <div 
                    className="progress-bar-fill" 
                    style={{ width: `${analyticsData.performance.daily_target}%` }}
                  ></div>
                </div>
                <span className="progress-value">{analyticsData.performance.daily_target}%</span>
              </div>
              <div className="progress-item">
                <span className="progress-label">Weekly Target</span>
                <div className="progress-bar-container">
                  <div 
                    className="progress-bar-fill" 
                    style={{ width: `${analyticsData.performance.weekly_target}%` }}
                  ></div>
                </div>
                <span className="progress-value">{analyticsData.performance.weekly_target}%</span>
              </div>
              <div className="progress-item">
                <span className="progress-label">Monthly Target</span>
                <div className="progress-bar-container">
                  <div 
                    className="progress-bar-fill" 
                    style={{ width: `${analyticsData.performance.monthly_target}%` }}
                  ></div>
                </div>
                <span className="progress-value">{analyticsData.performance.monthly_target}%</span>
              </div>
            </div>
          </div>

          {/* Inventory Health */}
          <div className="performance-card">
            <h4 className="performance-subtitle">Inventory Health</h4>
            <div className="inventory-grid">
              <div className="inventory-item">
                <span className="inventory-label">Optimal Stock</span>
                <span className="inventory-value">{analyticsData.inventory_health.optimal_stock}%</span>
              </div>
              <div className="inventory-item">
                <span className="inventory-label">Low Stock</span>
                <span className="inventory-value">{analyticsData.inventory_health.low_stock}%</span>
              </div>
              <div className="inventory-item">
                <span className="inventory-label">Out of Stock</span>
                <span className="inventory-value">{analyticsData.inventory_health.out_of_stock}%</span>
              </div>
              <div className="inventory-item">
                <span className="inventory-label">Overstock</span>
                <span className="inventory-value">{analyticsData.inventory_health.overstock}%</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="performance-card">
            <h4 className="performance-subtitle">Quick Actions</h4>
            <div className="actions-grid">
              <button 
                className="action-btn export-btn"
                onClick={handleExportReport}
                disabled={loading}
              >
                <span className="action-icon">📥</span>
                <span className="action-text">EXPORT REPORT</span>
              </button>
              <button 
                className="action-btn print-btn"
                onClick={handlePrintSummary}
                disabled={loading}
              >
                <span className="action-icon">🖨️</span>
                <span className="action-text">PRINT SUMMARY</span>
              </button>
              <button 
                className="action-btn email-btn"
                onClick={handleEmailReport}
                disabled={loading}
              >
                <span className="action-icon">📧</span>
                <span className="action-text">EMAIL REPORT</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Reports;