import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCompanyStore = create(
  persist(
    (set, get) => ({
      // Current company data
      currentCompany: null,
      companies: [],
      subscription: null,
      
      // Company branding
      branding: {
        logo: null,
        primaryColor: '#3b82f6',
        secondaryColor: '#1d4ed8',
        accentColor: '#60a5fa',
        theme: 'light', // light, dark, auto
        companyName: '',
        tagline: '',
      },
      
      // Set current company
      setCurrentCompany: (company) => set({ currentCompany: company }),
      
      // Update company branding
      updateBranding: (brandingData) => set((state) => ({
        branding: { ...state.branding, ...brandingData }
      })),
      
      // Upload logo
      uploadLogo: (logoUrl) => set((state) => ({
        branding: { ...state.branding, logo: logoUrl }
      })),
      
      // Set subscription
      setSubscription: (subscription) => set({ subscription }),
      
      // Check if subscription is active
      isSubscriptionActive: () => {
        const { subscription } = get();
        if (!subscription) return false;
        if (subscription.status === 'trial') return true;
        if (subscription.status === 'active') {
          return new Date(subscription.expiresAt) > new Date();
        }
        return false;
      },
      
      // Get subscription info
      getSubscriptionInfo: () => {
        const { subscription } = get();
        return subscription;
      },
      
      // Apply theme colors to document
      applyTheme: () => {
        const { branding } = get();
        document.documentElement.style.setProperty('--primary-color', branding.primaryColor);
        document.documentElement.style.setProperty('--secondary-color', branding.secondaryColor);
        document.documentElement.style.setProperty('--accent-color', branding.accentColor);
      },
      
      // Reset company (logout)
      resetCompany: () => set({
        currentCompany: null,
        subscription: null,
      }),
    }),
    {
      name: 'company-storage',
    }
  )
);
