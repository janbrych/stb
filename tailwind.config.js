/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        taxi: {
          50: '#fffbe1',
          100: '#fff3b8',
          200: '#ffe570',
          300: '#ffd22d',
          400: '#ffbd00',
          500: '#e69d00',
          600: '#cc7b00',
          700: '#a35700',
          800: '#854308',
          900: '#71370f',
        }
      }
    },
  },
  plugins: [],
}
