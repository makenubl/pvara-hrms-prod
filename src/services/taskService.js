import api from './api';

const taskService = {
  // Get all tasks
  getAll: async (filters = {}) => {
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const response = await api.get(`/tasks${queryParams ? `?${queryParams}` : ''}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch tasks' };
    }
  },

  // Get task by ID
  getById: async (id) => {
    try {
      const response = await api.get(`/tasks/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch task' };
    }
  },

  // Create task (admin only)
  create: async (taskData) => {
    try {
      const response = await api.post('/tasks', taskData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to create task' };
    }
  },

  // Update task
  update: async (id, taskData) => {
    try {
      const response = await api.put(`/tasks/${id}`, taskData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update task' };
    }
  },

  // Add update to task
  addUpdate: async (id, updateData) => {
    try {
      const response = await api.post(`/tasks/${id}/updates`, updateData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to add update' };
    }
  },

  // Delete task (admin only)
  delete: async (id) => {
    try {
      const response = await api.delete(`/tasks/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete task' };
    }
  },

  // Get task statistics (admin only)
  getStats: async () => {
    try {
      const response = await api.get('/tasks/stats/summary');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch task statistics' };
    }
  },

  // Add chairman comment to task
  addComment: async (id, comment) => {
    try {
      const response = await api.post(`/tasks/${id}/comments`, { comment });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to add comment' };
    }
  },

  // Add activity to task (task journey/timeline)
  addActivity: async (id, activityData) => {
    try {
      const response = await api.post(`/tasks/${id}/activities`, activityData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to add activity' };
    }
  },

  // Update activity status
  updateActivity: async (taskId, activityId, updateData) => {
    try {
      const response = await api.patch(`/tasks/${taskId}/activities/${activityId}`, updateData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update activity' };
    }
  },

  // Add attachment to task
  addAttachment: async (id, attachmentData) => {
    try {
      const response = await api.post(`/tasks/${id}/attachments`, attachmentData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to add attachment' };
    }
  },

  // Delete attachment
  deleteAttachment: async (taskId, attachmentId) => {
    try {
      const response = await api.delete(`/tasks/${taskId}/attachments/${attachmentId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete attachment' };
    }
  },
};

export default taskService;
