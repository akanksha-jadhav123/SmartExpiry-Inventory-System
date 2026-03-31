// src/pages/Profile.js
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosConfig";
import "../App.css";

function Profile() {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const navigate = useNavigate();

  const userName = localStorage.getItem("user_name");
  const userRole = localStorage.getItem("user_role_id");
  const userEmail = localStorage.getItem("user_email");

  const displayRole = useMemo(() => {
    if (userRole === "1") return "Admin";
    if (userRole === "3") return "Staff";
    return "User";
  }, [userRole]);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Try to fetch from backend
      const response = await api.get("/users/profile");
      setProfileData(response.data);
      setEditFormData(response.data);
    } catch (err) {
      console.error("Failed to fetch profile data:", err);
      
      // Fallback to localStorage data
      const fallbackData = {
        contact_email: userEmail || "N/A",
        contact_phone: "Not available",
        shop_name: "Your Shop",
        branch_name: "Main Branch",
        address: "Address not set"
      };
      setProfileData(fallbackData);
      setEditFormData(fallbackData);
      setError("Using cached profile data. Some features may be limited.");
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/');
      return;
    }
    fetchProfile();
  }, [fetchProfile, navigate]);

  const handleEditClick = () => {
    setIsEditing(true);
    setSaveError(null);
  };

  const handleCancelClick = () => {
    setIsEditing(false);
    setEditFormData(profileData);
    setSaveError(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveProfile = async () => {
    setSaveLoading(true);
    setSaveError(null);
    
    try {
      // Update profile via API
      const response = await api.put("/users/profile", editFormData);
      
      // Update local state with new data
      setProfileData(response.data);
      setIsEditing(false);
      
      // Update localStorage if email changed
      if (response.data.contact_email && response.data.contact_email !== userEmail) {
        localStorage.setItem("user_email", response.data.contact_email);
      }
      
      // Show success message
      setError("Profile updated successfully!");
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setError(null);
      }, 3000);
      
    } catch (err) {
      console.error("Failed to update profile:", err);
      setSaveError(
        err.response?.data?.message || 
        "Failed to update profile. Please try again."
      );
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container profile-page-container">
        <div className="card profile-card">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container profile-page-container">
      <div className="card profile-card">
        <div className="profile-header">
          <h2>Hello, {userName || "User"}! 👋</h2>
          <p className="profile-welcome">
            Welcome to your profile. Your access privileges and basic contact
            information are listed below.
          </p>
        </div>

        {error && (
          <div className={`profile-message ${error.includes("successfully") ? "profile-success" : "profile-error"}`}>
            <span>{error.includes("successfully") ? "✅" : "⚠️"}</span>
            {error}
          </div>
        )}

        {saveError && (
          <div className="profile-error">
            <span>❌</span>
            {saveError}
          </div>
        )}

        <div className="profile-details">
          {isEditing ? (
            <div className="profile-edit-form">
              <div className="form-group">
                <label htmlFor="contact_email">📧 Email</label>
                <input
                  type="email"
                  id="contact_email"
                  name="contact_email"
                  value={editFormData.contact_email || ""}
                  onChange={handleInputChange}
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="contact_phone">📞 Phone</label>
                <input
                  type="tel"
                  id="contact_phone"
                  name="contact_phone"
                  value={editFormData.contact_phone || ""}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Enter phone number"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="shop_name">🏪 Shop Name</label>
                <input
                  type="text"
                  id="shop_name"
                  name="shop_name"
                  value={editFormData.shop_name || ""}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Enter shop name"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="branch_name">🏢 Branch Name</label>
                <input
                  type="text"
                  id="branch_name"
                  name="branch_name"
                  value={editFormData.branch_name || ""}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Enter branch name"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="address">📍 Address</label>
                <textarea
                  id="address"
                  name="address"
                  value={editFormData.address || ""}
                  onChange={handleInputChange}
                  className="form-input form-textarea"
                  placeholder="Enter your address"
                  rows="3"
                />
              </div>
            </div>
          ) : (
            <div className="profile-info-grid">
              <div className="profile-info-item">
                <span className="profile-label">👤 Role</span>
                <span className="profile-value">
                  <span className="role-badge">{displayRole}</span>
                </span>
              </div>
              <div className="profile-info-item">
                <span className="profile-label">📧 Email</span>
                <span className="profile-value">{profileData?.contact_email || "N/A"}</span>
              </div>
              <div className="profile-info-item">
                <span className="profile-label">📞 Phone</span>
                <span className="profile-value">{profileData?.contact_phone || "N/A"}</span>
              </div>
              <div className="profile-info-item">
                <span className="profile-label">🏪 Shop Name</span>
                <span className="profile-value">{profileData?.shop_name || "N/A"}</span>
              </div>
              <div className="profile-info-item">
                <span className="profile-label">🏢 Branch Name</span>
                <span className="profile-value">{profileData?.branch_name || "N/A"}</span>
              </div>
              <div className="profile-info-item">
                <span className="profile-label">📍 Address</span>
                <span className="profile-value">{profileData?.address || "N/A"}</span>
              </div>
            </div>
          )}
        </div>

        <div className="profile-actions">
          {isEditing ? (
            <>
              <button 
                className="btn btn-primary" 
                onClick={handleSaveProfile}
                disabled={saveLoading}
              >
                {saveLoading ? (
                  <>
                    <div className="loading-spinner-small"></div>
                    Saving...
                  </>
                ) : (
                  "💾 Save Changes"
                )}
              </button>
              <button 
                className="btn btn-ghost" 
                onClick={handleCancelClick}
                disabled={saveLoading}
              >
                ❌ Cancel
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-primary" onClick={handleEditClick}>
                ✏️ Edit Profile
              </button>
              <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>
                📊 Back to Dashboard
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Profile;