import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Enable source maps for debugging (optional, remove in production if not needed)
    sourcemap: false,
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        // Manual chunks for better code splitting
        manualChunks: {
          // Vendor chunks - split large libraries
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts'],
          'vendor-pdf': ['jspdf', 'jspdf-autotable'],
          'vendor-utils': ['axios', 'date-fns', 'zustand', 'clsx'],
          'vendor-icons': ['lucide-react'],
        },
      },
    },
    // Target modern browsers for smaller bundle
    target: 'es2020',
    // Minification settings
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
      },
    },
  },
  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'axios', 'zustand'],
  },
})
