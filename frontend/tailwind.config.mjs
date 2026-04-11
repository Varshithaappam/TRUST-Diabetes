/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-blue': '#4F46E5',
        'status-controlled': '#22C55E',
        'status-uncontrolled': '#EF4444',
      },
      fontFamily: {
        // PDF Section 1.1: Primary font for Web/Electronic Media
        'serif': ['"Noto Serif"', 'serif'],
        // PDF Section 1.1: Primary font for Display/Stationery
        'display': ['Avenir', 'Helvetica', 'Arial', 'sans-serif'],
      },
      fontSize: {
        // Adding a specific brand size utility
        'brand': '11pt',
      }
    },
  },
  plugins: [],
}