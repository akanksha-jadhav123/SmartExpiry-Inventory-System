// src/components/LoadingSpinner.js
import React from 'react';
import 'App.css';

const LoadingSpinner = ({ size = 'medium', text = 'Loading...', overlay = false }) => {
  return (
    <div className={`loading-container ${overlay ? 'loading-overlay' : ''}`}>
      <div className={`spinner spinner-${size}`}>
        <div className="spinner-circle"></div>
      </div>
      {text && <div className="loading-text">{text}</div>}
    </div>
  );
};

export default LoadingSpinner;