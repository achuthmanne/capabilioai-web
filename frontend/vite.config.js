import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Load .env from project root (one level up from frontend/)
  envDir: '..',
  server: {
    port: 3000,
    // Proxy all /api/* requests to Express server during development
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  // Output build to project root dist/
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
})
