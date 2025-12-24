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

  // Boost/Expedite a task (chairperson energizes a task)
  boostTask: async (id, message) => {
    try {
      const response = await api.post(`/tasks/${id}/boost`, { message });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to boost task' };
    }
  },

  // Respond to a boost (assignee acknowledges and responds)
  respondToBoost: async (taskId, boostId, response) => {
    try {
      const res = await api.patch(`/tasks/${taskId}/boost/${boostId}`, { response, acknowledged: true });
      return res.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to respond to boost' };
    }
  },

  // Acknowledge a boost without response
  acknowledgeBoost: async (taskId, boostId) => {
    try {
      const response = await api.patch(`/tasks/${taskId}/boost/${boostId}`, { acknowledged: true });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to acknowledge boost' };
    }
  },

  // ==================== BOTTLENECK METHODS ====================

  // Raise a bottleneck (assignee requests support from chairperson)
  raiseBottleneck: async (taskId, { issue, description, category, severity }) => {
    try {
      const response = await api.post(`/tasks/${taskId}/bottleneck`, {
        issue,
        description,
        category,
        severity,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to raise bottleneck' };
    }
  },

  // Respond to a bottleneck (chairperson provides support)
  respondToBottleneck: async (taskId, bottleneckId, { chairpersonResponse, status, resolution }) => {
    try {
      const response = await api.patch(`/tasks/${taskId}/bottleneck/${bottleneckId}`, {
        chairpersonResponse,
        status,
        resolution,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to respond to bottleneck' };
    }
  },

  // Resolve a bottleneck (assignee marks as resolved)
  resolveBottleneck: async (taskId, bottleneckId) => {
    try {
      const response = await api.patch(`/tasks/${taskId}/bottleneck/${bottleneckId}`, {
        status: 'resolved',
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to resolve bottleneck' };
    }
  },

  // Get all bottlenecks (for chairperson dashboard)
  getAllBottlenecks: async () => {
    try {
      const response = await api.get('/tasks/bottlenecks/all');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get bottlenecks' };
    }
  },

  // Delegate task to another employee
  delegate: async (taskId, delegateTo, reason = '') => {
    try {
      const response = await api.post(`/tasks/${taskId}/delegate`, { delegateTo, reason });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delegate task' };
    }
  },

  // Get employees for delegation
  getEmployees: async () => {
    try {
      const response = await api.get('/chat/users');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch employees' };
    }
  },
};

export default taskService;
