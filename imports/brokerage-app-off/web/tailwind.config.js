/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand': '#00C805',
        'brand-dark': '#00B805',
        'background': '#1E2026',
        'surface': '#2A2D35',
        'text': '#FFFFFF',
        'text-secondary': '#A0A0A0',
      },
    },
  },
  plugins: [],
}
