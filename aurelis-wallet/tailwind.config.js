/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "#0a0a0c",
                foreground: "#ffffff",
                card: "#121216",
                "card-foreground": "#ffffff",
                border: "#27272a",
                primary: {
                    DEFAULT: "#d4af37", // Aurelis Gold
                    foreground: "#000000",
                },
                secondary: {
                    DEFAULT: "#1e1e24",
                    foreground: "#ffffff",
                },
                gold: {
                    50: '#fffbeb',
                    100: '#fef3c7',
                    200: '#fde68a',
                    300: '#fcd34d',
                    400: '#fbbf24',
                    500: '#f59e0b',
                    600: '#d97706',
                    700: '#b45309',
                    800: '#92400e',
                    900: '#78350f',
                    950: '#451a03',
                },
            },
            fontFamily: {
                sans: ['Outfit', 'sans-serif'],
                serif: ['Playfair Display', 'serif'],
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'gold-metallic': 'linear-gradient(135deg, #d4af37 0%, #f9e29c 45%, #d4af37 100%)',
            }
        },
    },
    plugins: [],
}
