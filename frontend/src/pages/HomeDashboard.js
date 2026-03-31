// src/pages/HomeDashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';

function HomeDashboard() {
    const navigate = useNavigate();
    const [userInfo, setUserInfo] = useState({
        name: '',
        email: '',
        role: ''
    });
    const [quickStats, setQuickStats] = useState({
        totalProducts: 0,
        expiringSoon: 0,
        lowStock: 0
    });

    useEffect(() => {
        // Get user info from localStorage
        const userName = localStorage.getItem('user_name');
        const userEmail = localStorage.getItem('user_email');
        const userRole = localStorage.getItem('user_role_id');
        
        setUserInfo({
            name: userName || 'User',
            email: userEmail || 'N/A',
            role: userRole === "1" ? 'Admin' : userRole === "3" ? 'Staff' : 'User'
        });

        // Mock quick stats - in real app, fetch from API
        setQuickStats({
            totalProducts: 45,
            expiringSoon: 3,
            lowStock: 7
        });
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user_role_id');
        localStorage.removeItem('user_name');
        localStorage.removeItem('user_email');
        navigate('/');
    };

    return (
        <div className="container" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
            <div className="card">
                <div className="card-header">
                    <h1 className="card-title">Dashboard Overview</h1>
                    <p className="card-subtitle">Welcome back, {userInfo.name}!</p>
                </div>

                <div className="profile-info-grid">
                    <div className="profile-info-item">
                        <span className="profile-label">👤 Name</span>
                        <span className="profile-value">{userInfo.name}</span>
                    </div>
                    <div className="profile-info-item">
                        <span className="profile-label">📧 Email</span>
                        <span className="profile-value">{userInfo.email}</span>
                    </div>
                    <div className="profile-info-item">
                        <span className="profile-label">🔐 Role</span>
                        <span className="profile-value">
                            <span className="role-badge">{userInfo.role}</span>
                        </span>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="stats-grid-three" style={{ margin: '2rem 0' }}>
                    <div className="stat-card">
                        <div className="stat-icon">📦</div>
                        <div className="stat-content">
                            <div className="stat-value">{quickStats.totalProducts}</div>
                            <div className="stat-label">Total Products</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">⏰</div>
                        <div className="stat-content">
                            <div className="stat-value">{quickStats.expiringSoon}</div>
                            <div className="stat-label">Expiring Soon</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">📉</div>
                        <div className="stat-content">
                            <div className="stat-value">{quickStats.lowStock}</div>
                            <div className="stat-label">Low Stock</div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap' }}>
                    <button 
                        className="btn btn-primary"
                        onClick={() => navigate('/dashboard')}
                    >
                        📊 Go to Full Dashboard
                    </button>
                    <button 
                        className="btn btn-secondary"
                        onClick={() => navigate('/add-product')}
                    >
                        📦 Add Product
                    </button>
                    <button 
                        className="btn btn-ghost"
                        onClick={handleLogout}
                    >
                        🚪 Logout
                    </button>
                </div>
            </div>
        </div>
    );
}

export default HomeDashboard;