import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev only: the browser talks to localhost:5173 and Vite forwards /api to Django,
// so the frontend and API share one origin (no CORS, session cookie just works).
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})