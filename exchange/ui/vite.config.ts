import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    base: '/exchange/',
    resolve: {
        dedupe: ['react', 'react-dom', 'react-virtuoso', 'zustand'],
        alias: {
            "@tradingserver/ui-core": path.resolve(__dirname, "../../packages/ui-core/src"),
            "react-virtuoso": path.resolve(__dirname, "node_modules/react-virtuoso"),
            "clsx": path.resolve(__dirname, "node_modules/clsx"),
            "tailwind-merge": path.resolve(__dirname, "node_modules/tailwind-merge"),
            "zustand": path.resolve(__dirname, "node_modules/zustand"),
            "react": path.resolve(__dirname, "node_modules/react"),
            "react-dom": path.resolve(__dirname, "node_modules/react-dom")
        }
    },
    optimizeDeps: {
        include: ['react-virtuoso', 'zustand', 'clsx', 'tailwind-merge', '@tradingserver/ui-core']
    },
    server: {
        host: true,
        port: 3003,
    }
})
