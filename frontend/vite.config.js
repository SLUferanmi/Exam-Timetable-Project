import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listen on all addresses
    strictPort: false,
    port: 5173,
    hmr: {
      overlay: false
    }
  },
  css: {
    devSourcemap: true,
  }
})
