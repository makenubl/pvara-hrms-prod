import api from './api';

const projectService = {
  // Get all projects
  getAll: async (filters = {}) => {
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const response = await api.get(`/projects${queryParams ? `?${queryParams}` : ''}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch projects' };
    }
  },

  // Get project by ID
  getById: async (id) => {
    try {
      const response = await api.get(`/projects/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch project' };
    }
  },

  // Create new project
  create: async (projectData) => {
    try {
      const response = await api.post('/projects', projectData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to create project' };
    }
  },

  // Update project
  update: async (id, projectData) => {
    try {
      const response = await api.put(`/projects/${id}`, projectData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update project' };
    }
  },

  // Add project update
  addUpdate: async (id, updateData) => {
    try {
      const response = await api.post(`/projects/${id}/updates`, updateData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to add update' };
    }
  },

  // Delete project
  delete: async (id) => {
    try {
      const response = await api.delete(`/projects/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete project' };
    }
  },

  // Get project stats
  getStats: async () => {
    try {
      const response = await api.get('/projects/stats/summary');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch project stats' };
    }
  },
};

export default projectService;
