import apiClient from './api';

const authService = {
  // Register new company and admin user
  register: async (data) => {
    try {
      const response = await apiClient.post('/auth/register', {
        companyName: data.companyName,
        companyEmail: data.companyEmail,
        adminFirstName: data.adminFirstName,
        adminLastName: data.adminLastName,
        adminEmail: data.adminEmail,
        password: data.password,
      });
      
      // Store token and user data
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Registration failed' };
    }
  },

  // Login user
  login: async (email, password) => {
    try {
      const response = await apiClient.post('/auth/login', {
        email,
        password,
      });
      
      // Store token and user data
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Login failed' };
    }
  },

  // Get current user
  getCurrentUser: async () => {
    try {
      const response = await apiClient.get('/auth/me');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get user' };
    }
  },

  // Logout
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  // Get stored user from localStorage
  getStoredUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  // Get stored token
  getToken: () => {
    return localStorage.getItem('token');
  },

  // Check if user is logged in
  isLoggedIn: () => {
    return !!localStorage.getItem('token');
  },
};

export default authService;
