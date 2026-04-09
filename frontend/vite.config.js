import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // Add this line

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // Add this line
  ],
  server: {
    proxy: {
      // This redirects all /api calls to your backend server
      '/api': {
        target: 'http://localhost:5000', // Change this to your backend port
        changeOrigin: true,
        secure: false,
      }
    }
  }
})