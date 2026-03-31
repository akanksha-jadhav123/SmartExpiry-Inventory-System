// src/pages/WelcomeLogo.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';

function WelcomeLogo() {
    const navigate = useNavigate();
    const [loadingProgress, setLoadingProgress] = useState(0);

    useEffect(() => {
        // Check if user is already logged in
        const token = localStorage.getItem('token');
        if (token) {
            navigate('/dashboard');
            return;
        }

        // Simulate loading progress
        const progressInterval = setInterval(() => {
            setLoadingProgress(prev => {
                if (prev >= 100) {
                    clearInterval(progressInterval);
                    return 100;
                }
                return prev + 10;
            });
        }, 200);

        // Redirect to login after 3 seconds
        const redirectTimer = setTimeout(() => {
            navigate('/login');
        }, 3000);

        return () => {
            clearInterval(progressInterval);
            clearTimeout(redirectTimer);
        };
    }, [navigate]);

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
                {/* Main Logo with Animation */}
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
                            <div className="stat-number">📦</div>
                            <div className="stat-label">Smart Inventory</div>
                        </div>
                        <div className="stat">
                            <div className="stat-number">⏰</div>
                            <div className="stat-label">Expiry Alerts</div>
                        </div>
                        <div className="stat">
                            <div className="stat-number">💰</div>
                            <div className="stat-label">Profit Tracking</div>
                        </div>
                    </div>
                </div>

                <div className="welcome-loader">
                    <div className="loader-dots">
                        <div className="dot"></div>
                        <div className="dot"></div>
                        <div className="dot"></div>
                    </div>
                    <p className="loading-text">Loading SmartExpiry...</p>
                    <div className="progress-bar" style={{width: '200px', margin: '1rem auto'}}>
                        <div 
                            className="progress-fill" 
                            style={{width: `${loadingProgress}%`}}
                        ></div>
                    </div>
                    <button 
                        className="skip-button"
                        onClick={() => navigate('/login')}
                    >
                        Skip intro
                    </button>
                </div>
            </div>
        </div>
    );
}

export default WelcomeLogo;