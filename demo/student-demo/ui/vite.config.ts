import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
    base: '/demo/',
    plugins: [react()],
    resolve: {
        preserveSymlinks: true,
        alias: {
            '@labs': process.env.DOCKER_BUILD
                ? path.resolve(__dirname, './src/labs_mirror')
                : path.resolve(__dirname, '../../labs')
        }
    },
    server: {
        port: 3000
    }
})
