import apiClient from './api';

const employeeService = {
  // Get all employees
  getAll: async (filters = {}) => {
    try {
      const response = await apiClient.get('/employees', { params: filters });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch employees' };
    }
  },

  // Get single employee
  getById: async (id) => {
    try {
      const response = await apiClient.get(`/employees/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch employee' };
    }
  },

  // Get employee's direct reports
  getDirectReports: async (employeeId) => {
    try {
      const response = await apiClient.get(`/employees/${employeeId}/reports`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch direct reports' };
    }
  },

  // Create new employee
  create: async (employeeData) => {
    try {
      const response = await apiClient.post('/employees', employeeData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to create employee' };
    }
  },

  // Update employee
  update: async (id, employeeData) => {
    try {
      const response = await apiClient.put(`/employees/${id}`, employeeData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update employee' };
    }
  },

  // Delete employee
  delete: async (id) => {
    try {
      const response = await apiClient.delete(`/employees/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete employee' };
    }
  },
};

export default employeeService;
