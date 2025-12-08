import apiClient from './api';

const approvalService = {
  // Create approval flow (for leave requests, etc)
  create: async (approvalData) => {
    try {
      const response = await apiClient.post('/approvals', approvalData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to create approval request' };
    }
  },

  // Get all approvals
  getAll: async (filters = {}) => {
    try {
      const response = await apiClient.get('/approvals', { params: filters });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch approvals' };
    }
  },

  // Get pending approvals for current user
  getPendingForMe: async () => {
    try {
      const response = await apiClient.get('/approvals/pending/me');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch pending approvals' };
    }
  },

  // Approve or reject an approval request
  approve: async (id, approvalData) => {
    try {
      const response = await apiClient.put(`/approvals/${id}/approve`, approvalData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to approve request' };
    }
  },
};

export default approvalService;
