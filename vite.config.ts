import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4000,
    strictPort: true, // Fail if port 4000 is not available
    host: true,
    allowedHosts: true, // Allow all hosts for Cloudflare tunnel
    proxy: {
      '/api': {
        target: 'http://localhost:4001',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@portal': path.resolve(__dirname, './src/portal'),
      '@reports': path.resolve(__dirname, './src/reports'),
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
})
