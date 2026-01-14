import api from './api';

const dailyWorklogService = {
  // ============================================
  // USER ENDPOINTS
  // ============================================
  
  // Get user's worklogs with optional filters
  getMyWorklogs: async (params = {}) => {
    const response = await api.get('/daily-worklogs', { params });
    return response.data;
  },

  // Check today's submission status
  checkTodayStatus: async () => {
    const response = await api.get('/daily-worklogs/today');
    return response.data;
  },

  // Submit daily worklog
  submit: async (data) => {
    const response = await api.post('/daily-worklogs', data);
    return response.data;
  },

  // Update worklog (same day only)
  update: async (id, data) => {
    const response = await api.put(`/daily-worklogs/${id}`, data);
    return response.data;
  },

  // Delete worklog (same day only)
  delete: async (id) => {
    const response = await api.delete(`/daily-worklogs/${id}`);
    return response.data;
  },

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================

  // Get all worklogs (admin view)
  getAllWorklogs: async (params = {}) => {
    const response = await api.get('/daily-worklogs/admin/all', { params });
    return response.data;
  },

  // Get submission status for a date
  getSubmissionStatus: async (date) => {
    const response = await api.get('/daily-worklogs/admin/submission-status', {
      params: { date }
    });
    return response.data;
  },

  // Get all active showstoppers
  getShowstoppers: async (params = {}) => {
    const response = await api.get('/daily-worklogs/admin/showstoppers', { params });
    return response.data;
  },

  // Get specific worklog (admin view)
  getWorklogById: async (id) => {
    const response = await api.get(`/daily-worklogs/admin/${id}`);
    return response.data;
  },

  // Add admin review/notes
  addReview: async (id, data) => {
    const response = await api.put(`/daily-worklogs/admin/${id}/review`, data);
    return response.data;
  },

  // Get overall statistics
  getStats: async (params = {}) => {
    const response = await api.get('/daily-worklogs/admin/stats', { params });
    return response.data;
  }
};

export default dailyWorklogService;
