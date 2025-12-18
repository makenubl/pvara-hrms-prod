import api from './api';

const chatService = {
  // Get company chat
  getCompanyChat: async () => {
    const response = await api.get('/chat/company');
    return response.data;
  },

  // Get messages (paginated)
  getMessages: async (params = {}) => {
    const response = await api.get('/chat/company/messages', { params });
    return response.data;
  },

  // Send message
  sendMessage: async (content) => {
    const response = await api.post('/chat/company/messages', { content });
    return response.data;
  },

  // Mark messages as read
  markAsRead: async () => {
    const response = await api.post('/chat/company/read');
    return response.data;
  },

  // Get unread count
  getUnreadCount: async () => {
    const response = await api.get('/chat/company/unread');
    return response.data;
  },

  // Get users for mentions
  getUsers: async () => {
    const response = await api.get('/chat/users');
    return response.data;
  },
};

export default chatService;
