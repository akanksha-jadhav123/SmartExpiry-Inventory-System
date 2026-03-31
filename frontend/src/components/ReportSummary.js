// src/components/ReportSummary.js
import React, { useState, useEffect } from "react";
import api from "../api/axiosConfig";
import "../App.css";

function ReportSummary() {
  const [summary, setSummary] = useState({
    total_revenue: 0,
    realized_profit: 0,
    total_invoices: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Format currency in Indian Rupees
  const formatINR = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return '₹0.00';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await api.get("/analytics/summary");
        setSummary(res.data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching report summary:", err);
        setError("Failed to load reports. Access may be restricted to Admin/Manager roles.");
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  if (loading) {
    return <p>Loading financial summary...</p>;
  }

  if (error) {
    return <p style={{ color: "red" }}>{error}</p>;
  }

  return (
    <div className="report-summary">
      <div className="summary-box revenue-box">
        <h4>Total Revenue 💰</h4>
        <p className="summary-value" style={{ color: '#2ecc71' }}>{formatINR(summary.total_revenue)}</p>
      </div>
      <div className="summary-box profit-box">
        <h4>Realized Profit 📈</h4>
        <p className="summary-value" style={{ color: '#27ae60' }}>{formatINR(summary.realized_profit)}</p>
      </div>
      <div className="summary-box invoices-box">
        <h4>Total Invoices 🧾</h4>
        <p className="summary-value">{summary.total_invoices}</p>
      </div>
    </div>
  );
}

export default ReportSummary;