import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: process.env.ELECTRON === 'true' ? './' : '/',
  server: {
    port: 5173,
    proxy: {
      // Competitor recommendation engine (local server)
      '/api/youtube': { target: 'http://localhost:3001', changeOrigin: true },
      '/api/competitors': { target: 'http://localhost:3001', changeOrigin: true },
      '/api/pulse': { target: 'http://localhost:3001', changeOrigin: true },
      '/api/rivals': { target: 'http://localhost:3001', changeOrigin: true },
      // Everything else → vibeshype.com backend
      '/api': { target: 'https://vibeshype.com', changeOrigin: true, secure: true },
    },
  },
  build: { outDir: 'dist' },
})
