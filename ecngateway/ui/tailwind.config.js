/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'bloomberg-bg': '#121212',
                'bloomberg-panel': '#1e1e1e',
                'bloomberg-orange': '#ff9800',
                'bloomberg-blue': '#03a9f4',
                'bloomberg-text': '#e0e0e0',
                'bloomberg-text-dim': '#a0a0a0',
                'bloomberg-border': '#333333',
            },
            fontFamily: {
                mono: ['Roboto Mono', 'monospace'],
                sans: ['Inter', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
