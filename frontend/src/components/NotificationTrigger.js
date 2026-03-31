import React, { useState } from 'react';
import api from '../api/axiosConfig';
import "../App.css";

const NotificationTrigger = ({ userRole, userId }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [notificationResult, setNotificationResult] = useState(null);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);

  const isAdmin = userRole === "1";

  // 🚀 MAIN FUNCTION: Send immediate notification when button is clicked
  const sendImmediateNotification = async () => {
    setIsLoading(true);
    setNotificationResult(null);

    try {
      console.log('🚀 Sending immediate notifications...');
      
      const response = await api.get('/notifications/send-immediate');
      
      setNotificationResult({
        success: true,
        data: response.data,
        message: '✅ Immediate notifications sent successfully!',
        type: 'immediate'
      });

      console.log('✅ Immediate notification successful:', response.data);

      // Auto-hide success after 6 seconds
      setTimeout(() => {
        setNotificationResult(null);
      }, 6000);

    } catch (error) {
      console.error('❌ Immediate notification error:', error);
      setNotificationResult({
        success: false,
        message: '❌ Failed to send immediate notifications',
        error: error.response?.data?.message || error.message,
        type: 'immediate'
      });
      
      // Auto-hide error after 6 seconds
      setTimeout(() => {
        setNotificationResult(null);
      }, 6000);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle button click - sends immediate notification and shows panel
  const handleNotificationButtonClick = () => {
    if (showNotificationPanel) {
      // If panel is open, close it
      setShowNotificationPanel(false);
      setNotificationResult(null);
    } else {
      // If panel is closed, send immediate notification and open panel
      sendImmediateNotification();
      setShowNotificationPanel(true);
    }
  };

  const triggerNotification = async (type) => {
    setIsLoading(true);
    setNotificationResult(null);

    try {
      let endpoint = '';
      let message = '';

      switch (type) {
        case 'immediate-me':
          endpoint = '/notifications/send-my-alerts';
          message = '🔔 Sending immediate notification to you...';
          break;
        case 'immediate-all':
          if (!isAdmin) {
            alert("Permission Denied: Only Administrators can send to all users.");
            return;
          }
          endpoint = '/notifications/send-immediate';
          message = '🚀 Sending immediate notifications to all admins...';
          break;
        case 'scheduled':
          if (!isAdmin) {
            alert("Permission Denied: Only Administrators can send scheduled notifications.");
            return;
          }
          endpoint = '/notifications/send-scheduled';
          message = '📅 Sending scheduled daily notifications...';
          break;
        case 'test':
          endpoint = '/notifications/test-email';
          message = '🧪 Testing email configuration...';
          break;
        case 'quick-check':
          endpoint = '/notifications/quick-check';
          message = '⚡ Running quick inventory check...';
          break;
        default:
          return;
      }

      const response = await api.get(endpoint);
      setNotificationResult({
        success: true,
        data: response.data,
        message: message,
        type: type
      });

      // Auto-hide success after 5 seconds
      setTimeout(() => {
        setNotificationResult(null);
      }, 5000);

    } catch (error) {
      console.error('Notification trigger error:', error);
      setNotificationResult({
        success: false,
        message: error.response?.data?.message || 'Failed to trigger notification',
        error: error.response?.data?.error || error.message,
        type: type
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getNotificationStats = () => {
    if (!notificationResult?.success || !notificationResult.data) return null;

    const { summary, details, stats, users_notified, products_alerted } = notificationResult.data;

    // Handle different response formats
    const totalAlerts = summary?.total_alerts || stats?.products || products_alerted || 0;
    const urgentAlerts = summary?.urgent_alerts || 0;
    const lowStockAlerts = summary?.low_stock_alerts || 0;
    const usersNotified = summary?.users_notified || stats?.users || (users_notified ? users_notified.length : 0);
    const emailsSent = summary?.emails_sent || stats?.emails_sent || 0;

    return (
      <div className="notification-stats">
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-number">{totalAlerts}</span>
            <span className="stat-label">Total Alerts</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{urgentAlerts}</span>
            <span className="stat-label">Urgent</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{lowStockAlerts}</span>
            <span className="stat-label">Low Stock</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{usersNotified}</span>
            <span className="stat-label">Users</span>
          </div>
        </div>

        {details && Array.isArray(details) && details.length > 0 && (
          <div className="notification-details">
            <h4>Notification Details:</h4>
            {details.map((userAlert, index) => (
              <div key={index} className="user-alert">
                <strong>👤 {userAlert.user || userAlert.admin}:</strong> 
                {userAlert.urgent_products || 0} urgent, 
                {userAlert.low_stock_products || 0} low stock products
              </div>
            ))}
          </div>
        )}

        {users_notified && Array.isArray(users_notified) && users_notified.length > 0 && (
          <div className="notification-details">
            <h4>Users Notified:</h4>
            {users_notified.map((username, index) => (
              <div key={index} className="user-alert">
                👤 {username}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const getButtonIcon = () => {
    if (isLoading) {
      return <div className="loading-spinner-small"></div>;
    }
    
    if (notificationResult) {
      return notificationResult.success ? '✅' : '❌';
    }
    
    return '🔔';
  };

  return (
    <div className="notification-trigger-container">
      {/* 🚀 MAIN NOTIFICATION BUTTON - Sends immediate notification on click */}
      <button 
        className={`notification-floating-btn ${isLoading ? 'loading' : ''} ${notificationResult ? (notificationResult.success ? 'success' : 'error') : ''}`}
        onClick={handleNotificationButtonClick}
        title="Click to send immediate notifications"
        disabled={isLoading}
      >
        <span className="btn-icon">{getButtonIcon()}</span>
        
        {notificationResult && (
          <span className={`notification-indicator ${notificationResult.success ? 'success' : 'error'}`}></span>
        )}
        
        {isLoading && (
          <div className="pulse-animation"></div>
        )}
      </button>

      {/* Notification Panel */}
      {showNotificationPanel && (
        <div className="notification-panel">
          <div className="notification-header">
            <h3>🚀 Notification Center</h3>
            <button 
              className="close-btn"
              onClick={() => setShowNotificationPanel(false)}
            >
              ×
            </button>
          </div>

          <div className="notification-buttons">
            <button 
              className={`notification-btn primary ${isLoading ? 'loading' : ''}`}
              onClick={() => triggerNotification('immediate-all')}
              disabled={isLoading}
            >
              <span className="btn-icon">🚀</span>
              <span className="btn-text">Send to All Admins</span>
              {isLoading && <div className="btn-spinner"></div>}
            </button>

            <button 
              className={`notification-btn secondary ${isLoading ? 'loading' : ''}`}
              onClick={() => triggerNotification('immediate-me')}
              disabled={isLoading}
            >
              <span className="btn-icon">🔔</span>
              <span className="btn-text">Send My Alert</span>
            </button>

            {isAdmin && (
              <button 
                className={`notification-btn scheduled ${isLoading ? 'loading' : ''}`}
                onClick={() => triggerNotification('scheduled')}
                disabled={isLoading}
              >
                <span className="btn-icon">📅</span>
                <span className="btn-text">Send Daily Report</span>
              </button>
            )}

            <button 
              className={`notification-btn test ${isLoading ? 'loading' : ''}`}
              onClick={() => triggerNotification('test')}
              disabled={isLoading}
            >
              <span className="btn-icon">🧪</span>
              <span className="btn-text">Test Email</span>
            </button>

            <button 
              className={`notification-btn simple ${isLoading ? 'loading' : ''}`}
              onClick={() => triggerNotification('quick-check')}
              disabled={isLoading}
            >
              <span className="btn-icon">⚡</span>
              <span className="btn-text">Quick Check</span>
            </button>
          </div>

          {/* Results Display */}
          {notificationResult && (
            <div className={`notification-result ${notificationResult.success ? 'success' : 'error'}`}>
              <div className="result-header">
                <span className="result-icon">
                  {notificationResult.success ? '✅' : '❌'}
                </span>
                <span className="result-message">
                  {notificationResult.message || notificationResult.data?.message}
                </span>
              </div>
              
              {notificationResult.error && (
                <div className="error-details">
                  Error: {notificationResult.error}
                </div>
              )}

              {getNotificationStats()}

              {notificationResult.success && notificationResult.type === 'immediate' && (
                <div className="result-actions">
                  <button 
                    className="action-btn primary"
                    onClick={sendImmediateNotification}
                    disabled={isLoading}
                  >
                    Send Again
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="notification-info">
            <p>💡 <strong>Click the bell button</strong> to immediately send urgent alerts</p>
            <p>🕘 <strong>Automatic:</strong> Daily scheduled notifications at 9:00 AM</p>
            <p>🔔 <strong>Auto-check:</strong> Immediate alerts every 30 minutes</p>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {showNotificationPanel && (
        <div 
          className="notification-backdrop"
          onClick={() => setShowNotificationPanel(false)}
        ></div>
      )}
    </div>
  );
};

export default NotificationTrigger;