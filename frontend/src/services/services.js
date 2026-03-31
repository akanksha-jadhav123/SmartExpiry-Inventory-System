import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth services
export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) => api.post('/auth/reset-password', { token, newPassword }),
  validateResetToken: (token) => api.get(`/auth/validate-reset-token/${token}`),
};

// Product services
export const productService = {
  getProducts: () => api.get('/products'),
  addProduct: (productData) => api.post('/products', productData),
  updateProduct: (id, productData) => api.put(`/products/${id}`, productData),
  deleteProduct: (id) => api.delete(`/products/${id}`),
  getProductStats: () => api.get('/products/stats'),
};

// Billing services
export const billingService = {
  createBill: (billData) => api.post('/bills', billData),
  getAllBills: () => api.get('/bills'),
  getBillDetails: (id) => api.get(`/bills/${id}`),
};

// Invoice services
export const invoiceService = {
  createInvoice: (invoiceData) => api.post('/invoices', invoiceData),
  getInvoices: () => api.get('/invoices'),
  getInvoiceDetails: (id) => api.get(`/invoices/${id}`),
};

// Category services
export const categoryService = {
  getCategories: () => api.get('/categories'),
  createCategory: (categoryData) => api.post('/categories', categoryData),
};

// Location services
export const locationService = {
  getLocations: () => api.get('/locations'),
  createLocation: (locationData) => api.post('/locations', locationData),
};

// Customer services
export const customerService = {
  getCustomers: () => api.get('/customers'),
  createCustomer: (customerData) => api.post('/customers', customerData),
  updateCustomer: (id, customerData) => api.put(`/customers/${id}`, customerData),
};

// Alert services
export const alertService = {
  getSettings: () => api.get('/alerts/settings'),
  updateSettings: (settings) => api.post('/alerts/settings', settings),
  getProductsWithStatus: () => api.get('/alerts/status'),
};

// Analytics services
export const analyticsService = {
  getSummaryAnalytics: () => api.get('/analytics/summary'),
  getExpiryAnalytics: () => api.get('/analytics/expiry'),
};

// User services
export const userService = {
  getProfile: () => api.get('/users/profile'),
  getAllUsers: () => api.get('/users'),
  updateUser: (id, userData) => api.put(`/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/users/${id}`),
};

// Shop services
export const shopService = {
  getAllShops: () => api.get('/shops'),
  getAvailableShops: () => api.get('/shops/available'),
  getShopById: (id) => api.get(`/shops/${id}`),
  getShopUsers: (id) => api.get(`/shops/${id}/users`),
  createShop: (shopData) => api.post('/shops', shopData),
};

// Admin services
export const adminService = {
  getDashboard: () => api.get('/admin/dashboard'),
  getAllProducts: (params) => api.get('/admin/products', { params }),
  getShopStatistics: () => api.get('/admin/shop-stats'),
};

// Notification services
export const notificationService = {
  simpleExpiryCheck: () => api.post('/notifications/expiry-check'),
};

export default api;