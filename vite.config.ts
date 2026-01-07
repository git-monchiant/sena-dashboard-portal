import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@portal': path.resolve(__dirname, './src/portal'),
      '@reports': path.resolve(__dirname, './src/reports'),
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
})
