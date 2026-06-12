import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Root-level vite config: serves the frontend/ directory so `npm run dev`
// from the project root works without needing to cd into frontend/.
export default defineConfig({
  root: './frontend',   // Vite's web root — index.html lives here
  plugins: [react()],
  envDir: '..',         // Load .env from the project root (one level up from frontend/)
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../dist',  // Output to project root /dist
    emptyOutDir: true,
  },
})
