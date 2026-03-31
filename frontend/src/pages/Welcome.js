// src/pages/Welcome.js
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';

function Welcome() {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/dashboard');
      return;
    }

    // Redirect to login after 5 seconds
    const timer = setTimeout(() => {
      navigate('/login');
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  const features = [
    {
      icon: '📦',
      title: 'Smart Inventory',
      description: 'Track and manage your inventory with real-time updates'
    },
    {
      icon: '⏰',
      title: 'Expiry Alerts',
      description: 'Get automatic notifications for expiring products'
    },
    {
      icon: '💰',
      title: 'Billing System',
      description: 'Fast and efficient billing with customer management'
    },
    {
      icon: '📊',
      title: 'Analytics',
      description: 'Detailed reports and insights for better decisions'
    }
  ];

  return (
    <div className="welcome-container">
      {/* Animated Background */}
      <div className="welcome-background">
        <div className="floating-shape shape-1"></div>
        <div className="floating-shape shape-2"></div>
        <div className="floating-shape shape-3"></div>
        <div className="floating-shape shape-4"></div>
      </div>

      <div className="welcome-content">
        {/* Main Hero Section */}
        <div className="welcome-hero">
          <div className="hero-logo">
            <div className="logo-orb">
              <span className="logo-icon">🏪</span>
            </div>
            <h1 className="hero-title">SmartExpiry</h1>
            <p className="hero-subtitle">Intelligent Inventory Management System</p>
          </div>

          <div className="hero-stats">
            <div className="stat">
              <div className="stat-number">500+</div>
              <div className="stat-label">Businesses Trust Us</div>
            </div>
            <div className="stat">
              <div className="stat-number">1M+</div>
              <div className="stat-label">Products Managed</div>
            </div>
            <div className="stat">
              <div className="stat-number">99.9%</div>
              <div className="stat-label">Uptime</div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="features-section">
          <h2 className="features-title">Everything You Need to Manage Your Inventory</h2>
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="cta-section">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Transform Your Inventory Management?</h2>
            <p className="cta-description">
              Join thousands of businesses using SmartExpiry to streamline their operations and boost profitability.
            </p>
            <div className="cta-buttons">
              <button 
                className="btn btn-primary btn-lg"
                onClick={() => navigate('/login')}
              >
                <span>🚀</span>
                Get Started Now
              </button>
              <button 
                className="btn btn-outline btn-lg"
                onClick={() => navigate('/register')}
              >
                <span>📝</span>
                Create Account
              </button>
            </div>
          </div>
        </div>

        {/* Loading Indicator */}
        <div className="welcome-loader">
          <div className="loader-dots">
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
          <p className="loading-text">Taking you to the login page...</p>
          <button 
            className="skip-button"
            onClick={() => navigate('/login')}
          >
            Skip waiting
          </button>
        </div>
      </div>
    </div>
  );
}

export default Welcome;