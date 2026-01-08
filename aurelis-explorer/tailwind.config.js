/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "#050505",
                foreground: "#ffffff",
                card: "#0f0f0f",
                border: "#1a1a1a",
                primary: "#d4af37",
            },
            fontFamily: {
                sans: ['Outfit', 'sans-serif'],
                serif: ['Playfair Display', 'serif'],
            },
            backgroundImage: {
                'gold-metallic': 'linear-gradient(135deg, #d4af37 0%, #f9e29c 45%, #d4af37 100%)',
            }
        },
    },
    plugins: [],
}
