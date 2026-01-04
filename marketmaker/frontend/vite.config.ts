import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        port: 3002,
        proxy: {
            '/api': {
                target: process.env.BACKEND_URL || 'http://localhost:8001',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, '')
            },
            '/ws': {
                target: process.env.BACKEND_WS_URL || 'ws://localhost:8001',
                ws: true
            }
        }
    }
})
