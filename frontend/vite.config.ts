import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Defaults to the backend running directly on the host (local dev). In docker-compose, the
// frontend container can't reach the backend via localhost — it's set to http://backend:4000
// (the compose service name) via the API_PROXY_TARGET env var instead.
const apiProxyTarget = process.env.API_PROXY_TARGET || 'http://localhost:4000'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: ['finpro-portal.cloudvoice.network'],
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
    },
  },
})
