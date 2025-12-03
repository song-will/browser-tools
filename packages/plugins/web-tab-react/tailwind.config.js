/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-dark': '#121212',
        'card-dark': '#1e1e1e',
        'text-primary': 'rgba(255, 255, 255, 0.87)',
        'text-secondary': 'rgba(255, 255, 255, 0.6)',
        'accent': '#bb86fc',
        'bg-light': '#f5f5f5',
        'card-light': '#ffffff',
        'text-primary-light': 'rgba(0, 0, 0, 0.87)',
        'text-secondary-light': 'rgba(0, 0, 0, 0.6)',
        'accent-light': '#6200ee',
      },
      fontFamily: {
        sans: ['Segoe UI', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
