import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: process.env.ELECTRON === 'true' ? './' : '/',
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'https://vibeshype.com', changeOrigin: true, secure: true },
    },
  },
  build: { outDir: 'dist' },
})
