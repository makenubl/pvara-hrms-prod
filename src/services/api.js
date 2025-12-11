import axios from 'axios';
import logger from '../utils/logger.js';

// Get API base URL - use environment variable or fallback to backend URL
const API_BASE_URL = 
  typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:5000'
    : (import.meta.env.VITE_API_URL || 'https://pvara-hrms-prod.vercel.app');

logger.info('🌐 API Base URL configured', { url: API_BASE_URL });

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL.includes('/api') ? API_BASE_URL : `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    logger.logApiRequest(config.method.toUpperCase(), config.url, config.data);
    return config;
  },
  (error) => {
    logger.error('API Request Error', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    logger.logApiResponse(
      response.config.method.toUpperCase(),
      response.config.url,
      response.status,
      response.data
    );
    return response;
  },
  (error) => {
    const method = error.config?.method?.toUpperCase() || 'UNKNOWN';
    const url = error.config?.url || 'UNKNOWN';
    
    if (error.response?.status === 401) {
      logger.warn('Authentication failed - redirecting to login', { url });
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    } else {
      logger.logApiError(method, url, error);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
