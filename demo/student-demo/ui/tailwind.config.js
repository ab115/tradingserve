/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "../labs/**/*.{js,ts,jsx,tsx}" // Include labs folder for Blotter.tsx styling!
    ],
    theme: {
        extend: {},
    },
    plugins: [],
}
