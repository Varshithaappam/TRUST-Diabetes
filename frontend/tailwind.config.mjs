/** @type {import('tailwindcss').Config} */
module.exports = {
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
        'avenir': ['Avenir', 'Avenir Next', 'sans-serif'],
        'avenir-black': ['Avenir Black', 'Avenir', 'sans-serif'],
        'avenir-medium': ['Avenir Medium', 'Avenir', 'sans-serif'],
        'avenir-roman': ['Avenir Roman', 'Avenir', 'sans-serif'],
        'noto-serif': ['Noto Serif', 'serif'],
        'sans': ['Avenir', 'Avenir Next', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
