// src/App.js - Enhanced with Professional UI
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import AddProduct from './pages/AddProduct';
import Billing from './pages/Billing';
import Reports from './pages/Reports';
import UserManagement from './pages/UserManagement';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import WelcomeLogo from './pages/WelcomeLogo';
import './App.css';

// Enhanced Background Elements Component
const BackgroundElements = () => {
  return (
    <div className="background-elements">
      <div className="floating-shape"></div>
      <div className="floating-shape"></div>
      <div className="floating-shape"></div>
      <div className="floating-shape"></div>
      <div className="floating-shape"></div>
    </div>
  );
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check authentication status on app load
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('user_role_id');
    
    if (token) {
      setIsLoggedIn(true);
      setUserRole(role);
    }
    
    // Simulate loading for better UX
    setTimeout(() => {
      setIsLoading(false);
    }, 1500);
  }, []);

  const handleLogin = (userData) => {
    setIsLoggedIn(true);
    setUserRole(userData.role_id);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserRole(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user_role_id');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_email');
  };

  if (isLoading) {
    return (
      <div className="app-loading-screen">
        <div className="loading-container">
          <div className="loading-logo">
            <div className="logo-circle">
              <span className="logo-icon">🏪</span>
            </div>
            <h1 className="app-title">SmartExpiry</h1>
          </div>
          <div className="loading-progress">
            <div className="progress-bar">
              <div className="progress-fill"></div>
            </div>
            <p className="loading-text">Initializing your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="app-container">
        <BackgroundElements />
        <Navbar isLoggedIn={isLoggedIn} userRole={userRole} onLogout={handleLogout} />
        
        <main className="main-content">
          <Routes>
            {/* Public Routes */}
            <Route 
              path="/" 
              element={isLoggedIn ? <Navigate to="/dashboard" /> : <WelcomeLogo />} 
            />
            <Route 
              path="/login" 
              element={isLoggedIn ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />} 
            />
            <Route 
              path="/register" 
              element={isLoggedIn ? <Navigate to="/dashboard" /> : <Register />} 
            />
            <Route 
              path="/forgot-password" 
              element={isLoggedIn ? <Navigate to="/dashboard" /> : <ForgotPassword />} 
            />
            <Route 
              path="/reset-password" 
              element={isLoggedIn ? <Navigate to="/dashboard" /> : <ResetPassword />} 
            />

            {/* Protected Routes */}
            <Route 
              path="/dashboard" 
              element={isLoggedIn ? <Dashboard /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/profile" 
              element={isLoggedIn ? <Profile /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/add-product" 
              element={isLoggedIn ? <AddProduct /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/billing" 
              element={isLoggedIn ? <Billing /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/reports" 
              element={isLoggedIn ? <Reports /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/admin/users" 
              element={isLoggedIn && userRole === "1" ? <UserManagement /> : <Navigate to="/dashboard" />} 
            />

            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;