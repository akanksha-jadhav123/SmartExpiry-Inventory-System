// src/pages/ForgotPassword.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import '../App.css';

function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resetLink, setResetLink] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!email || email.trim() === '') {
            setError('Please enter your email address');
            return;
        }

        setLoading(true);
        setError('');
        setMessage('');
        setResetLink('');

        const cleanEmail = email.trim().toLowerCase();
        console.log('📧 Requesting password reset for:', cleanEmail);

        try {
            const response = await api.post('/auth/forgot-password', { email: cleanEmail });
            console.log('✅ Response:', response.data);
            
            if (response.data.success) {
                setMessage(response.data.message);
                
                // Show reset link for testing
                if (response.data.debug && response.data.debug.resetLink) {
                    setResetLink(response.data.debug.resetLink);
                    setMessage('Password reset link generated successfully! Use the link below to test.');
                }
            } else {
                setError(response.data.message || 'Something went wrong');
            }

        } catch (err) {
            console.error('❌ Error:', err);
            setError(err.response?.data?.message || 'Failed to process request');
        } finally {
            setLoading(false);
        }
    };

    const createTestUser = async () => {
        if (!email || email.trim() === '') {
            setError('Please enter an email address first');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const cleanEmail = email.trim().toLowerCase();
            const response = await api.post('/auth/create-test-user', {
                email: cleanEmail,
                username: 'Test User',
                password: 'password123'
            });
            
            if (response.data.success) {
                setMessage(`✅ ${response.data.message}. You can now request a password reset.`);
            } else {
                setError(response.data.message || 'Failed to create user');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create test user');
        } finally {
            setLoading(false);
        }
    };

    const testSystem = async () => {
        setLoading(true);
        try {
            const response = await api.get('/auth/test-system');
            if (response.data.success) {
                setMessage('✅ System is working correctly!');
                console.log('System info:', response.data.systemInfo);
            }
        } catch (err) {
            setError('System test failed');
        } finally {
            setLoading(false);
        }
    };

    const clearAll = () => {
        setEmail('');
        setMessage('');
        setError('');
        setResetLink('');
    };

    return (
        <div className="container">
            <div className="card" style={{ maxWidth: '600px', margin: '40px auto' }}>
                <h2>🔐 Forgot Password</h2>
                
                <p style={{ textAlign: 'center', marginBottom: '20px', color: '#666' }}>
                    Enter your email to generate a password reset link.
                </p>

                {/* Control buttons */}
                <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button 
                        onClick={testSystem}
                        disabled={loading}
                        style={{
                            background: '#6c757d',
                            color: 'white',
                            border: 'none',
                            padding: '8px 12px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            opacity: loading ? 0.6 : 1
                        }}
                    >
                        🧪 Test System
                    </button>
                    <button 
                        onClick={createTestUser}
                        disabled={loading || !email}
                        style={{
                            background: '#28a745',
                            color: 'white',
                            border: 'none',
                            padding: '8px 12px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            opacity: (loading || !email) ? 0.6 : 1
                        }}
                    >
                        👤 Create User
                    </button>
                    <button 
                        onClick={clearAll}
                        style={{
                            background: '#dc3545',
                            color: 'white',
                            border: 'none',
                            padding: '8px 12px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer'
                        }}
                    >
                        🗑️ Clear
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="form-group">
                    <input
                        className="input"
                        type="email"
                        placeholder="Enter your email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{ marginBottom: '15px' }}
                        disabled={loading}
                    />
                    
                    <button 
                        className="button" 
                        type="submit" 
                        disabled={loading || !email}
                        style={{ 
                            width: '100%', 
                            opacity: (loading || !email) ? 0.6 : 1,
                            background: '#007bff'
                        }}
                    >
                        {loading ? '🔄 Processing...' : '🔗 Generate Reset Link'}
                    </button>
                </form>

                {/* Reset Link Display */}
                {resetLink && (
                    <div style={{ 
                        background: '#e8f4fd',
                        border: '2px solid #007bff',
                        padding: '15px',
                        borderRadius: '8px',
                        marginTop: '15px'
                    }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#007bff' }}>
                            🎯 Password Reset Link
                        </h4>
                        <div style={{ 
                            background: 'white',
                            padding: '10px',
                            borderRadius: '4px',
                            border: '1px solid #ddd',
                            marginBottom: '10px',
                            wordBreak: 'break-all',
                            fontSize: '12px'
                        }}>
                            {resetLink}
                        </div>
                        <a 
                            href={resetLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="button"
                            style={{
                                display: 'block',
                                textAlign: 'center',
                                background: '#28a745',
                                textDecoration: 'none'
                            }}
                        >
                            🔄 Test Password Reset
                        </a>
                    </div>
                )}

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

                {/* Instructions */}
                <div style={{ 
                    marginTop: '20px', 
                    padding: '15px', 
                    background: '#fff3cd', 
                    borderRadius: '5px',
                    fontSize: '12px',
                    color: '#856404',
                    border: '1px solid #ffeaa7'
                }}>
                    <strong>🚀 Quick Instructions:</strong>
                    <ol style={{ margin: '8px 0', paddingLeft: '20px' }}>
                        <li>Enter your email address</li>
                        <li>Click "Create User" if the email doesn't exist</li>
                        <li>Click "Generate Reset Link"</li>
                        <li>Use the reset link to test password reset</li>
                    </ol>
                </div>

                <div style={{ marginTop: '15px', textAlign: 'center' }}>
                    <Link to="/login" style={{ marginRight: '15px' }}>← Back to Login</Link>
                    <Link to="/register">Create New Account</Link>
                </div>
            </div>
        </div>
    );
}

export default ForgotPassword;