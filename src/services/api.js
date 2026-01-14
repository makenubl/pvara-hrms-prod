import axios from 'axios';
import logger from '../utils/logger.js';

// Get API base URL - prefer env, fallback to localhost, else main Vercel deployment
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost') {
      return 'http://localhost:5000';
    }
    // For feature branch preview deployments, use the feature branch backend
    if (window.location.hostname.includes('feature')) {
      return 'https://pvara-hrms-prod-git-feature-integrate-2e546b-makenubls-projects.vercel.app';
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
      // Token expired or invalid - clear ALL auth storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Also clear zustand persist store to prevent redirect loops
      localStorage.removeItem('auth-store');
      window.location.href = '/login';
    } else {
      logger.logApiError(method, url, error);
    }
    return Promise.reject(error);
  }
);

// Storage APIs for folders and uploads
export const storageApi = {
  createFolder: (name) =>
    apiClient.post('/storage/folders', { name }),

  deleteFolder: (folder) =>
    apiClient.delete('/storage/folders', { data: { folder } }),

  listFolders: () =>
    apiClient.get('/storage/folders'),

  listFiles: (folder) =>
    apiClient.get('/storage/files', { params: { folder } }),

  uploadToFolder: (folder, files) => {
    console.log('📤 uploadToFolder called with:', { folder, fileCount: files.length, fileNames: files.map(f => f.name) });
    const formData = new FormData();
    formData.append('folder', folder);
    files.forEach(file => {
      console.log('  Adding file:', file.name, 'Size:', file.size, 'Type:', file.type);
      formData.append('files', file);
    });
    console.log('📨 Posting to /storage/upload');
    return apiClient.post('/storage/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(response => {
      console.log('✅ Upload response received:', response.status, response.data);
      return response;
    }).catch(error => {
      console.error('❌ Upload error:', error.response?.status, error.response?.data || error.message);
      throw error;
    });
  },

  listRecommendations: (folder, document) =>
    apiClient.get('/storage/recommendations', { params: { folder, document } }),

  decideRecommendations: (folder, document, version, acceptIds, rejectIds) => 
    apiClient.post('/storage/recommendations/decision', {
      folder,
      document,
      version,
      acceptIds,
      rejectIds,
    }),

  chatAboutRecommendations: (folder, document, message) =>
    apiClient.post('/storage/chat', { folder, document, message }),

  getStorageChat: (folder, document) =>
    apiClient.get('/storage/chat', { params: { folder, document } }),

  applyChangesWithGPT: (folder, document, recommendations) =>
    apiClient.post('/storage/apply-changes', { folder, document, recommendations }),

  deleteFile: (folder, fileName) =>
    apiClient.delete('/storage/files', { data: { folder, fileName } }),

  downloadFile: async (folder, fileName) => {
    // First try to get S3 download URL
    try {
      const response = await apiClient.get('/storage/download', {
        params: { folder, file: fileName }
      });
      // If we get a downloadUrl, return it
      if (response.data?.downloadUrl) {
        return response;
      }
    } catch (e) {
      // Fall through to blob download
    }
    
    // Fall back to blob download for local storage
    const response = await apiClient.get('/storage/download', {
      params: { folder, file: fileName },
      responseType: 'blob'
    });
    return response;
  },
};

export default apiClient;
