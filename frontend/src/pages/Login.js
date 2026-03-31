// src/pages/Login.js - Split Screen
import React, { useState } from "react";
import api from "../api/axiosConfig";
import { useNavigate, Link } from "react-router-dom";
import "../App.css";

function Login({ onLogin }) {
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.post("/auth/login", formData);
      
      localStorage.setItem("token", res.data.token);
      
      if (res.data.user && res.data.user.role_id) {
        localStorage.setItem("user_role_id", res.data.user.role_id.toString());
        localStorage.setItem("user_name", res.data.user.username);
        localStorage.setItem("user_email", res.data.user.email);
      }
      
      if (onLogin && res.data.user) {
        onLogin(res.data.user);
      }
      
      navigate("/dashboard");
      
    } catch (err) {
      const errorMessage = err.response?.data?.message || 
                          "Invalid email or password";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="split-login-container">
      {/* Left Side - Brand */}
      <div className="login-brand-side">
        <div className="brand-content">
          <div className="brand-logo">
            <div className="logo-wrapper">
              <span className="logo">🏪</span>
            </div>
            <h1>SmartExpiry</h1>
          </div>
          <div className="brand-tagline">
            <h2>Intelligent Inventory Management</h2>
            <p>Streamline your inventory, automate expiry tracking, and boost your business efficiency.</p>
          </div>
          <div className="feature-list">
            <div className="feature-item">
              <span className="feature-icon">📦</span>
              <span>Smart Inventory Tracking</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">⏰</span>
              <span>Automated Expiry Alerts</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">💰</span>
              <span>Sales & Analytics</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="login-form-side">
        <div className="form-container">
          <div className="form-header">
            <h2>Sign In</h2>
            <p>Enter your credentials to access your account</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="input-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
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
              <label htmlFor="password">Password</label>
              <div className="password-wrapper">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}

            <button 
              type="submit" 
              className="submit-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="button-spinner"></div>
                  Signing In...
                </>
              ) : (
                "Sign In to Dashboard"
              )}
            </button>
          </form>

          <div className="form-footer">
            <div className="footer-links">
              <Link to="/forgot-password">Forgot your password?</Link>
              <Link to="/register">Create new account</Link>
            </div>
            
            <div className="demo-section">
              <p className="demo-label">Demo Access:</p>
              <div className="demo-accounts">
                <div className="demo-account">
                  <strong>Admin:</strong> admin@smartexpiry.com
                </div>
                <div className="demo-account">
                  <strong>Staff:</strong> staff@smartexpiry.com
                </div>
                <div className="demo-password">
                  <strong>Password for both:</strong> demo123
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;