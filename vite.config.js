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
    outDir: '../dist',
    emptyOutDir: true,
    // ── Code splitting — prevents a 3–6MB monolithic JS bundle ────────────────
    // Each chunk loads only when the user navigates to that feature.
    // react + react-dom: always needed → inline in main chunk
    // Heavy libraries (Three.js, Recharts, jsPDF etc.) → separate lazy chunks
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Core React runtime — kept in main bundle
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/")) return "vendor-react"
          // Chart library (~400kb)
          if (id.includes("node_modules/recharts"))      return "vendor-charts"
          // 3D library (~600kb) — only used in specific pages
          if (id.includes("node_modules/three"))         return "vendor-three"
          // Animation library (~150kb)
          if (id.includes("node_modules/framer-motion")) return "vendor-motion"
          // PDF generation (~500kb) — only used on resume/export pages
          if (id.includes("node_modules/jspdf") || id.includes("node_modules/html2canvas")) return "vendor-pdf"
          // Supabase client (~300kb)
          if (id.includes("node_modules/@supabase"))     return "vendor-supabase"
          // All other node_modules → shared vendor chunk
          if (id.includes("node_modules/"))              return "vendor-misc"
        },
      },
    },
    // Warn when any chunk exceeds 600kb (down from Vite's default 500kb — we
    // split intentionally, so raise the warning threshold slightly)
    chunkSizeWarningLimit: 600,
  },
})
