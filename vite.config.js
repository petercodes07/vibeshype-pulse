import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: process.env.ELECTRON === 'true' ? './' : '/',
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://vibeshype.com',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            proxyReq.setHeader('Origin', 'https://vibeshype.com')
            proxyReq.setHeader('Referer', 'https://vibeshype.com/')
            console.log('[proxy →]', req.method, req.url)
          })
          proxy.on('proxyRes', (proxyRes, req) => console.log('[proxy ←]', proxyRes.statusCode, req.url))
          proxy.on('error', (err) => console.error('[proxy error]', err.message))
        },
      },
    },
  },
  build: { outDir: 'dist' },
})
