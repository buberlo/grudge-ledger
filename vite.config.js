import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiPort = process.env.API_PORT || '4000'
const apiTarget = process.env.API_TARGET || `http://localhost:${apiPort}`

const apiProxy = {
  '/api': {
    target: apiTarget,
    changeOrigin: true,
    ws: true,
  },
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: apiProxy,
  },
  preview: {
    port: 4173,
    proxy: apiProxy,
  },
})