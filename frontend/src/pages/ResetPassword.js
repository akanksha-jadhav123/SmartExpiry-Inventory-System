// src/pages/ResetPassword.js
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import '../App.css';

function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');
    
    const [formData, setFormData] = useState({
        newPassword: '',
        confirmPassword: ''
    });
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [tokenValid, setTokenValid] = useState(null);

    useEffect(() => {
        // Validate token on component mount
        if (token) {
            validateToken();
        } else {
            setError('Invalid reset link');
        }
    }, [token]);

    const validateToken = async () => {
        try {
            const response = await api.get(`/auth/validate-reset-token/${token}`);
            setTokenValid(response.data.valid);
        } catch (err) {
            setTokenValid(false);
            setError('Invalid or expired reset link');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (formData.newPassword !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.newPassword.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        setLoading(true);

        try {
            const response = await api.post('/auth/reset-password', {
                token,
                newPassword: formData.newPassword
            });
            
            setMessage(response.data.message);
            
            // Redirect to login after 3 seconds
            setTimeout(() => {
                navigate('/');
            }, 3000);

        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    if (tokenValid === null) {
        return (
            <div className="container">
                <div className="card" style={{ maxWidth: '400px', margin: '40px auto', textAlign: 'center' }}>
                    <h2>Validating Link...</h2>
                    <p>Please wait while we validate your reset link.</p>
                </div>
            </div>
        );
    }

    if (!tokenValid) {
        return (
            <div className="container">
                <div className="card" style={{ maxWidth: '400px', margin: '40px auto', textAlign: 'center' }}>
                    <h2>❌ Invalid Link</h2>
                    <p style={{ color: '#e74c3c', marginBottom: '20px' }}>
                        This password reset link is invalid or has expired.
                    </p>
                    <Link to="/forgot-password" className="button">
                        Request New Reset Link
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="container">
            <div className="card" style={{ maxWidth: '400px', margin: '40px auto' }}>
                <h2>🔑 Reset Password</h2>
                <p style={{ textAlign: 'center', marginBottom: '20px', color: '#666' }}>
                    Enter your new password below.
                </p>

                <form onSubmit={handleSubmit} className="form-group">
                    <input
                        className="input"
                        type="password"
                        name="newPassword"
                        placeholder="New Password (min 6 characters)"
                        value={formData.newPassword}
                        onChange={handleChange}
                        required
                    />
                    
                    <input
                        className="input"
                        type="password"
                        name="confirmPassword"
                        placeholder="Confirm New Password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                    />
                    
                    <button 
                        className="button" 
                        type="submit" 
                        disabled={loading}
                    >
                        {loading ? 'Resetting...' : 'Reset Password'}
                    </button>
                </form>

                {message && (
                    <div style={{ 
                        background: '#d4edda', 
                        color: '#155724', 
                        padding: '12px', 
                        borderRadius: '5px',
                        marginTop: '15px',
                        textAlign: 'center'
                    }}>
                        ✅ {message}
                    </div>
                )}

                {error && (
                    <div style={{ 
                        background: '#f8d7da', 
                        color: '#721c24', 
                        padding: '12px', 
                        borderRadius: '5px',
                        marginTop: '15px',
                        textAlign: 'center'
                    }}>
                        ❌ {error}
                    </div>
                )}

                <p style={{ marginTop: 15, textAlign: 'center' }}>
                    <Link to="/">Back to Login</Link>
                </p>
            </div>
        </div>
    );
}

export default ResetPassword;