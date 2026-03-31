// src/pages/UserManagement.js
import React, { useState, useEffect } from "react";
import api from "../api/axiosConfig";
import "../App.css";

const ROLE_OPTIONS = [
  { value: 'Staff', label: 'Staff', color: '#2a9d8f' },
  { value: 'Admin', label: 'Administrator', color: '#007bff' },
  { value: 'Manager', label: 'Manager', color: '#f59e0b' }
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active', color: '#10b981' },
  { value: 'inactive', label: 'Inactive', color: '#6b7280' },
  { value: 'suspended', label: 'Suspended', color: '#ef4444' }
];

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [updateFormData, setUpdateFormData] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fetchUsers = async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await api.get("/users/all");
      
      // Handle both response formats for backward compatibility
      const usersData = Array.isArray(response.data) ? response.data : (response.data.users || []);
      
      const usersWithRoleNames = usersData.map(user => ({
        ...user,
        role_name: user.role_id === 1 ? 'Admin' : user.role_id === 2 ? 'Manager' : 'Staff',
        status: user.status || 'active'
      }));
      
      setUsers(usersWithRoleNames);
    } catch (err) {
      console.error("Fetch Users Error:", err);
      
      // More specific error messages
      if (err.response?.status === 403) {
        setError("Access denied. You need administrator privileges to view users.");
      } else if (err.response?.status === 401) {
        setError("Please log in again to access user management.");
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.response?.data?.error) {
        setError(`Server error: ${err.response.data.error}`);
      } else {
        setError("Failed to load users. Please check your permissions and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      return;
    }
    
    setActionLoading(userId);
    setError(null);
    
    try {
      await api.delete(`/users/${userId}`);
      setUsers(users.filter(user => user.id !== userId));
      
      // Show success message
      setError(`User "${userName}" deleted successfully.`);
      setTimeout(() => setError(null), 3000);
    } catch (err) {
      console.error("Delete User Error:", err);
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError("Failed to delete user. Only administrators can perform this action.");
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setUpdateFormData({ 
      username: user.username, 
      email: user.email, 
      role: user.role_name, 
      phone: user.phone || '',
      status: user.status || 'active'
    });
  };

  const handleUpdateChange = (e) => {
    setUpdateFormData({ ...updateFormData, [e.target.name]: e.target.value });
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!editingUser) return;

    setActionLoading(`edit-${editingUser.id}`);
    
    const ROLE_MAP = { 'Admin': 1, 'Manager': 2, 'Staff': 3 };

    try {
      await api.put(`/users/${editingUser.id}`, {
        username: updateFormData.username,
        email: updateFormData.email,
        phone: updateFormData.phone,
        role_name: updateFormData.role,
        status: updateFormData.status,
      });

      setUsers(users.map(u => 
        u.id === editingUser.id 
          ? { 
              ...u, 
              username: updateFormData.username, 
              email: updateFormData.email, 
              role_id: ROLE_MAP[updateFormData.role],
              role_name: updateFormData.role,
              phone: updateFormData.phone,
              status: updateFormData.status
            } 
          : u
      ));
      
      setEditingUser(null);
      setError(`User "${updateFormData.username}" updated successfully.`);
      setTimeout(() => setError(null), 3000);
    } catch (err) {
      console.error("Update User Error:", err);
      setError(err.response?.data?.message || "Failed to update user. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const getRoleStyle = (roleId) => {
    const role = ROLE_OPTIONS.find(r => r.value === (roleId === 1 ? 'Admin' : roleId === 2 ? 'Manager' : 'Staff'));
    return {
      background: `${role.color}15`,
      color: role.color,
      border: `1px solid ${role.color}30`
    };
  };

  const getStatusStyle = (status) => {
    const statusOption = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
    return {
      background: `${statusOption.color}15`,
      color: statusOption.color,
      border: `1px solid ${statusOption.color}30`
    };
  };

  if (loading) {
    return (
      <div className="container">
        <div className="card">
          <div className="loading-state">
            <div className="loading-spinner large"></div>
            <p>Loading user data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container user-management-container">
      <div className="card">
        <div className="card-header">
          <div>
            <h1 className="card-title">User Management</h1>
            <p className="card-subtitle">Manage user accounts and permissions</p>
          </div>
          <div className="user-stats">
            <span className="stat-badge">Total: {users.length} users</span>
          </div>
        </div>

        {/* Search and Controls */}
        <div className="management-controls">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search users by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <button className="btn btn-primary btn-sm" onClick={fetchUsers}>
            <span>🔄</span>
            Refresh
          </button>
        </div>

        {/* Error/Success Message */}
        {error && (
          <div className={`message-banner ${error.includes('successfully') ? 'success' : 'error'}`}>
            <span className="message-icon">
              {error.includes('successfully') ? '✅' : '❌'}
            </span>
            {error}
          </div>
        )}

        {/* Users Table */}
        <div className="table-container">
          <table className="data-table enhanced">
            <thead>
              <tr>
                <th>User</th>
                <th>Contact</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="no-data">
                    <div className="empty-state">
                      <span className="empty-icon">👥</span>
                      <h3>No users found</h3>
                      <p>{searchTerm ? 'Try adjusting your search terms' : 'No users in the system'}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="user-row">
                    <td>
                      <div className="user-info">
                        <div className="user-avatar">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="user-details">
                          <strong className="user-name">{user.username}</strong>
                          <span className="user-id">ID: {user.id}</span>
                          <span className="user-join">Joined: {new Date(user.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="contact-info">
                        <div className="contact-email">{user.email}</div>
                        {user.phone && (
                          <div className="contact-phone">{user.phone}</div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span 
                        className="role-badge"
                        style={getRoleStyle(user.role_id)}
                      >
                        {user.role_name}
                      </span>
                    </td>
                    <td>
                      <span 
                        className="status-badge"
                        style={getStatusStyle(user.status)}
                      >
                        <span className="status-dot" style={{backgroundColor: getStatusStyle(user.status).color}}></span>
                        {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleEdit(user)}
                          disabled={actionLoading === `edit-${user.id}`}
                        >
                          {actionLoading === `edit-${user.id}` ? (
                            <div className="mini-spinner"></div>
                          ) : (
                            <>
                              <span>✏️</span>
                              Edit
                            </>
                          )}
                        </button>
                        {user.id !== 1 && ( 
                          <button 
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(user.id, user.username)}
                            disabled={actionLoading === user.id}
                          >
                            {actionLoading === user.id ? (
                              <div className="mini-spinner"></div>
                            ) : (
                              <>
                                <span>🗑️</span>
                                Delete
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="modal-overlay">
          <div className="modal-content large">
            <div className="modal-header">
              <h3 className="modal-title">
                <span>✏️</span>
                Edit User: {editingUser.username}
              </h3>
              <button 
                className="modal-close" 
                onClick={() => setEditingUser(null)}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleUpdateSubmit} className="user-form">
              <div className="form-group">
                <div className="form-row">
                  <div className="form-field">
                    <label className="form-label">
                      <span>👤</span>
                      Username
                    </label>
                    <input
                      type="text"
                      name="username"
                      placeholder="Enter username"
                      value={updateFormData.username}
                      onChange={handleUpdateChange}
                      className="form-input"
                      required
                    />
                  </div>
                  
                  <div className="form-field">
                    <label className="form-label">
                      <span>📧</span>
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      placeholder="Enter email address"
                      value={updateFormData.email}
                      onChange={handleUpdateChange}
                      className="form-input"
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label className="form-label">
                      <span>📞</span>
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      placeholder="Enter phone number"
                      value={updateFormData.phone}
                      onChange={handleUpdateChange}
                      className="form-input"
                    />
                  </div>
                  
                  <div className="form-field">
                    <label className="form-label">
                      <span>🔐</span>
                      User Role
                    </label>
                    <select
                      name="role"
                      value={updateFormData.role}
                      onChange={handleUpdateChange}
                      className="form-input form-select"
                      required
                    >
                      {ROLE_OPTIONS.map(role => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label className="form-label">
                      <span>📊</span>
                      Account Status
                    </label>
                    <select
                      name="status"
                      value={updateFormData.status}
                      onChange={handleUpdateChange}
                      className="form-input form-select"
                      required
                    >
                      {STATUS_OPTIONS.map(status => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button 
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setEditingUser(null)}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="btn btn-primary"
                  disabled={actionLoading === `edit-${editingUser.id}`}
                >
                  {actionLoading === `edit-${editingUser.id}` ? (
                    <>
                      <div className="mini-spinner"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <span>💾</span>
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}