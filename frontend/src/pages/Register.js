// src/pages/Register.js - Split Screen
import React, { useState } from 'react';
import api from '../api/axiosConfig';
import { useNavigate, Link } from 'react-router-dom';
import '../App.css';

const ROLE_OPTIONS = [
  { value: 'Staff', label: 'Staff Member', description: 'Basic inventory access' },
  { value: 'Manager', label: 'Store Manager', description: 'Oversee operations and reports' },
  { value: 'Admin', label: 'Administrator', description: 'Full system access' }
];

const ROLE_MAP = {
  'Staff': 3,
  'Manager': 2, 
  'Admin': 1
};

function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    phone: '',
    shopName: '',
    role: 'Staff',
    branchName: '', 
    address: '', 
  });
  const [error, setError] = useState(null); 
  const [message, setMessage] = useState(null); 
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null);
  };

  const validateStep1 = () => {
    if (!formData.username || !formData.email || !formData.password) {
      setError('Please fill in all required fields');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep1()) {
      setCurrentStep(2);
      setError(null);
    }
  };

  const prevStep = () => {
    setCurrentStep(1);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        role_id: ROLE_MAP[formData.role] || 3 // Default to Staff
      };
      
      const res = await api.post("/auth/register", submitData);
      
      setMessage(res.data.message || "Registration successful!");
      
      setTimeout(() => {
        navigate("/login");
      }, 2000);

    } catch (err) {
      const errorMessage = err.response?.data?.message || "Registration failed. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: '📊',
      title: 'Real-time Analytics',
      description: 'Monitor your inventory performance with live dashboards'
    },
    {
      icon: '⏰',
      title: 'Smart Alerts',
      description: 'Get notified before products expire or run low'
    },
    {
      icon: '💰',
      title: 'Profit Tracking',
      description: 'Track sales and profitability in real-time'
    },
    {
      icon: '🛒',
      title: 'Easy Billing',
      description: 'Fast and efficient customer billing system'
    }
  ];

  return (
    <div className="split-register-container">
      {/* Left Side - Brand */}
      <div className="register-brand-side">
        <div className="brand-content">
          <div className="brand-logo">
            <div className="logo-wrapper">
              <span className="logo">🏪</span>
            </div>
            <h1>SmartExpiry</h1>
          </div>
          
          {/* Feature Cards at Top - 3 in one line */}
          <div className="feature-grid-top">
            {features.slice(0, 3).map((feature, index) => (
              <div key={index} className="feature-card-top">
                <div className="feature-icon-top">{feature.icon}</div>
                <div className="feature-content-top">
                  <h4>{feature.title}</h4>
                  <p>{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="progress-indicator">
            <div className="progress-steps">
              <div className={`step ${currentStep >= 1 ? 'active' : ''}`}>
                <div className="step-number">1</div>
                <div className="step-label">Account Info</div>
              </div>
              <div className="step-connector"></div>
              <div className={`step ${currentStep >= 2 ? 'active' : ''}`}>
                <div className="step-number">2</div>
                <div className="step-label">Business Info</div>
              </div>
            </div>
          </div>

          <div className="brand-tagline">
            <h2>Start Your Inventory Management Journey</h2>
            <p>Join thousands of businesses that trust SmartExpiry to streamline their operations and boost efficiency.</p>
          </div>

          {/* Remaining feature card */}
          <div className="single-feature-bottom">
            {features.slice(3, 4).map((feature, index) => (
              <div key={index} className="feature-card-single">
                <div className="feature-icon-single">{feature.icon}</div>
                <div className="feature-content-single">
                  <h4>{feature.title}</h4>
                  <p>{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Register Form */}
      <div className="register-form-side">
        <div className="form-container">
          <div className="form-header">
            <h2>Create Account</h2>
            <p>{currentStep === 1 ? 'Step 1: Personal Information' : 'Step 2: Business Information'}</p>
          </div>

          <form onSubmit={handleSubmit} className="register-form">
            {currentStep === 1 && (
              <div className="form-step">
                <div className="input-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    name="username"
                    placeholder="Your full name"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="input-group">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="input-group">
                  <label>Password *</label>
                  <input
                    type="password"
                    name="password"
                    placeholder="Minimum 6 characters"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                  <div className="password-strength">
                    <div className={`strength-bar ${formData.password.length >= 6 ? 'strong' : 'weak'}`}></div>
                    <span>{formData.password.length >= 6 ? 'Strong password' : 'Weak password'}</span>
                  </div>
                </div>

                <div className="input-group">
                  <label>Phone Number *</label>
                  <input
                    type="tel"
                    name="phone"
                    placeholder="Your phone number"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="form-step">
                <div className="input-group">
                  <label>Shop/Business Name *</label>
                  <input
                    type="text"
                    name="shopName"
                    placeholder="Your business name"
                    value={formData.shopName}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="input-group">
                  <label>Your Role *</label>
                  <div className="role-options">
                    {ROLE_OPTIONS.map((role) => (
                      <label key={role.value} className="role-option">
                        <input
                          type="radio"
                          name="role"
                          value={role.value}
                          checked={formData.role === role.value}
                          onChange={handleChange}
                          disabled={loading}
                        />
                        <div className="role-content">
                          <strong>{role.label}</strong>
                          <span>{role.description}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="input-group">
                  <label>Branch Name</label>
                  <input
                    type="text"
                    name="branchName"
                    placeholder="Branch name (optional)"
                    value={formData.branchName}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="input-group">
                  <label>Business Address</label>
                  <textarea
                    name="address"
                    placeholder="Your business address (optional)"
                    value={formData.address}
                    onChange={handleChange}
                    rows="3"
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}

            {message && (
              <div className="success-message">
                <span className="success-icon">✅</span>
                {message}
              </div>
            )}

            <div className="form-actions">
              {currentStep === 1 ? (
                <button 
                  type="button" 
                  className="next-button"
                  onClick={nextStep}
                >
                  Continue to Business Info
                  <span>→</span>
                </button>
              ) : (
                <div className="step-actions">
                  <button 
                    type="button" 
                    className="back-button"
                    onClick={prevStep}
                    disabled={loading}
                  >
                    ← Back
                  </button>
                  <button 
                    type="submit" 
                    className="submit-button"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className="button-spinner"></div>
                        Creating Account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </button>
                </div>
              )}
            </div>
          </form>

          <div className="form-footer">
            <p>Already have an account? <Link to="/login">Sign in here</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;