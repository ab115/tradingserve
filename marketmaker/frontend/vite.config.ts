import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
import path from "path";

export default defineConfig({
    plugins: [react()],
    base: '/marketmaker/',
    resolve: {
        alias: {
            "@tradingserver/ui-core": path.resolve(__dirname, "../../packages/ui-core/src"),
            "react-virtuoso": path.resolve(__dirname, "node_modules/react-virtuoso"),
            "clsx": path.resolve(__dirname, "node_modules/clsx"),
            "tailwind-merge": path.resolve(__dirname, "node_modules/tailwind-merge"),
            "zustand": path.resolve(__dirname, "node_modules/zustand"),
            "react": path.resolve(__dirname, "node_modules/react"),
            "react-dom": path.resolve(__dirname, "node_modules/react-dom")
        },
    },
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
