import apiClient from './api';

const positionService = {
  // Get all positions
  getAll: async () => {
    try {
      const response = await apiClient.get('/positions');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch positions' };
    }
  },

  // Get organization hierarchy
  getHierarchy: async () => {
    try {
      const response = await apiClient.get('/positions/hierarchy');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch hierarchy' };
    }
  },

  // Get single position
  getById: async (id) => {
    try {
      const response = await apiClient.get(`/positions/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch position' };
    }
  },

  // Create new position
  create: async (positionData) => {
    try {
      const response = await apiClient.post('/positions', positionData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to create position' };
    }
  },

  // Update position
  update: async (id, positionData) => {
    try {
      const response = await apiClient.put(`/positions/${id}`, positionData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update position' };
    }
  },

  // Delete position
  delete: async (id) => {
    try {
      const response = await apiClient.delete(`/positions/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete position' };
    }
  },
};

export default positionService;
