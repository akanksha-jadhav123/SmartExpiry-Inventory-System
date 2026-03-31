// src/components/Navbar.js
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import '../App.css';

function Navbar({ isLoggedIn, userRole, onLogout }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const isActiveLink = (path) => {
    return location.pathname === path;
  };

  // Check if user is admin (role_id = 1)
  const isAdmin = userRole === "1";

  return (
    <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
      <Link to="/" className="brand">
        <span className="brand-icon">🏪</span>
        <span>SmartExpiry</span>
      </Link>

      <button 
        className={`mobile-menu-toggle ${isMobileMenuOpen ? 'active' : ''}`}
        onClick={toggleMobileMenu}
        aria-label="Toggle navigation menu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <div className={`nav-links ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        {isLoggedIn ? (
          <>
            <Link 
              to="/dashboard" 
              className={`nav-link ${isActiveLink('/dashboard') ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="nav-icon">📊</span>
              Dashboard
            </Link>
            
            <Link 
              to="/billing" 
              className={`nav-link ${isActiveLink('/billing') ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="nav-icon">🛒</span>
              Billing
              <span className="nav-badge">New</span>
            </Link>
            
            <Link 
              to="/add-product" 
              className={`nav-link ${isActiveLink('/add-product') ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="nav-icon">📦</span>
              Add Product
            </Link>
            
            <Link 
              to="/reports" 
              className={`nav-link ${isActiveLink('/reports') ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="nav-icon">📈</span>
              Reports
            </Link>
            
            {/* Only show User Management for Admin users */}
            {isAdmin && (
              <Link 
                to="/admin/users" 
                className={`nav-link user-management ${isActiveLink('/admin/users') ? 'active' : ''}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="nav-icon">👥</span>
                User Management
              </Link>
            )}
            
            <Link 
              to="/profile" 
              className={`nav-link ${isActiveLink('/profile') ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="nav-icon">👤</span>
              Profile
            </Link>
            
            <button 
              className="nav-link logout-btn"
              onClick={handleLogout}
            >
              <span className="nav-icon">🚪</span>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link 
              to="/login" 
              className={`nav-link ${isActiveLink('/login') ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="nav-icon">🔐</span>
              Login
            </Link>
            
            <Link 
              to="/register" 
              className={`nav-link ${isActiveLink('/register') ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="nav-icon">📝</span>
              Register
            </Link>
          </>
        )}
      </div>

      {isLoggedIn && (
        <div className="user-info">
          <div className="user-avatar">
            {localStorage.getItem('user_name')?.charAt(0) || 'U'}
          </div>
          <div className="user-details">
            <span className="user-name">{localStorage.getItem('user_name') || 'User'}</span>
            <span className="user-role">
              {userRole === "1" ? 'Admin' : userRole === "2" ? 'Manager' : 'Staff'}
            </span>
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;