import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    allowedHosts: ['upon-requires-normally-total.trycloudflare.com'],
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
