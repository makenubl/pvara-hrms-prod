import { create } from 'zustand';

export const useAppStore = create((set) => ({
  sidebarOpen: true,
  theme: 'light',
  notifications: [],
  currentCompany: null,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setTheme: (theme) => set({ theme }),
  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        { id: Date.now(), ...notification },
      ],
    })),
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
  setCurrentCompany: (company) => set({ currentCompany: company }),
}));
