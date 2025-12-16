import axios from 'axios';
import logger from '../utils/logger.js';

// Get API base URL - prefer env, fallback to localhost, else main Vercel deployment
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost') {
      return 'http://localhost:5001';
    }
    // For any production domain (pvara.team, vercel.app), use the main API
    return 'https://pvara-hrms-prod.vercel.app';
  }
  return 'https://pvara-hrms-prod.vercel.app';
};

const API_BASE_URL = getApiBaseUrl();

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
