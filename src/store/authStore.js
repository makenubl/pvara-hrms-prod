import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,
      role: null,
      permissions: [],

      login: async (email) => {
        set({ isLoading: true, error: null });
        try {
          // Mock login - replace with actual API call
          const mockUser = {
            id: '1',
            name: 'John Doe',
            email,
            role: 'HR_MANAGER',
            department: 'Human Resources',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
            permissions: [
              'view_employees',
              'manage_employees',
              'approve_leave',
              'manage_payroll',
            ],
          };

          set({
            user: mockUser,
            token: 'mock-jwt-token',
            role: mockUser.role,
            permissions: mockUser.permissions,
            isLoading: false,
          });

          return { success: true, user: mockUser };
        } catch (error) {
          set({ error: error.message, isLoading: false });
          return { success: false, error: error.message };
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          role: null,
          permissions: [],
        });
      },

      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      setRole: (role) => set({ role }),
      setPermissions: (permissions) => set({ permissions }),
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
