// Auth utility functions for frontend

// Environment-aware API URL — auto-detects local vs production
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : `${window.location.origin}/api`;

// Get token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

// Get user role from localStorage
const getUserRole = () => {
  return localStorage.getItem('userRole');
};

// Get user name from localStorage
const getUserName = () => {
  const firstName = localStorage.getItem('firstName') || 'User';
  const lastName = localStorage.getItem('lastName') || '';
  return `${firstName} ${lastName}`.trim();
};

// Get user ID from localStorage
const getUserId = () => {
  return localStorage.getItem('userId');
};

// Check if user is logged in
const isLoggedIn = () => {
  return !!getAuthToken();
};

// Logout user — clear ALL stored user data
const logout = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userId');
  localStorage.removeItem('firstName');
  localStorage.removeItem('lastName');
  window.location.href = '/pages/login.html';
};

// Make authenticated API request
const apiCall = async (endpoint, options = {}) => {
  const token = getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // If unauthorized, logout user
  if (response.status === 401) {
    logout();
    throw new Error('Session expired. Please login again.');
  }

  return response;
};

// Redirect if not logged in
const requireAuth = () => {
  if (!isLoggedIn()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
};

// Redirect if already logged in
const redirectIfLoggedIn = () => {
  if (isLoggedIn()) {
    window.location.href = 'dashboard.html';
  }
};

// Format number as INR currency using Intl.NumberFormat
const formatINR = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};
