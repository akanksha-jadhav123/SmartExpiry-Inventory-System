import React from 'react';

const NotificationToast = ({ notification, onClose }) => {
  if (!notification) return null;

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  return (
    <div className={`notification-toast ${notification.type}`}>
      <div className="notification-toast-content">
        <div className="notification-icon">
          {icons[notification.type]}
        </div>
        <div className="notification-body">
          <div className="notification-title">
            {notification.title}
          </div>
          <div className="notification-message">
            {notification.message}
          </div>
          <div className="notification-timestamp">
            {notification.timestamp}
          </div>
        </div>
        <button 
          className="notification-close"
          onClick={onClose}
          aria-label="Close notification"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default NotificationToast;