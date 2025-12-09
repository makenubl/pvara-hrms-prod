import apiClient from './api';

const payrollService = {
  // Get payroll entries (optionally by month: YYYY-MM)
  getAll: async (month) => {
    try {
      const response = await apiClient.get('/payrolls', { params: month ? { month } : {} });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch payroll entries' };
    }
  },

  // Bulk upload payroll entries
  bulkUpload: async (records) => {
    try {
      const response = await apiClient.post('/payrolls/bulk', { records });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to upload payroll data' };
    }
  },

  // Get summary for a month
  getSummary: async (month) => {
    try {
      const response = await apiClient.get('/payrolls/summary', { params: month ? { month } : {} });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch payroll summary' };
    }
  },
};

export default payrollService;
