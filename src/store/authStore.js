import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import authService from '../services/authService';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,
      role: null,
      permissions: [],

      // Register new company
      register: async (companyData) => {
        set({ isLoading: true, error: null });
        try {
          const result = await authService.register(companyData);
          
          set({
            user: result.user,
            token: result.token,
            role: result.user.role,
            permissions: result.user.permissions || [],
            isLoading: false,
          });

          return { success: true, user: result.user };
        } catch (error) {
          const errorMsg = error.message || 'Registration failed';
          set({ error: errorMsg, isLoading: false });
          return { success: false, error: errorMsg };
        }
      },

      // Login with email and password
      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const result = await authService.login(email, password);
          
          set({
            user: result.user,
            token: result.token,
            role: result.user.role,
            permissions: result.user.permissions || [],
            isLoading: false,
          });

          return { success: true, user: result.user };
        } catch (error) {
          const errorMsg = error.message || 'Login failed';
          set({ error: errorMsg, isLoading: false });
          return { success: false, error: errorMsg };
        }
      },

      // Get current user from API
      getCurrentUser: async () => {
        set({ isLoading: true, error: null });
        try {
          const result = await authService.getCurrentUser();
          
          set({
            user: result,
            role: result.role,
            permissions: result.permissions || [],
            isLoading: false,
          });

          return result;
        } catch (error) {
          // If token is invalid, logout
          authService.logout();
          set({ 
            user: null, 
            token: null, 
            error: 'Session expired', 
            isLoading: false 
          });
          return null;
        }
      },

      // Logout
      logout: () => {
        authService.logout();
        set({
          user: null,
          token: null,
          role: null,
          permissions: [],
          error: null,
        });
      },

      // Utility setters
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      setRole: (role) => set({ role }),
      setPermissions: (permissions) => set({ permissions }),
      setError: (error) => set({ error }),
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        role: state.role,
        permissions: state.permissions,
      }),
    }
  )
);
