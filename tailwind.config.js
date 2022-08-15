/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{html,js,ts,jsx,tsx}',
    'index.html',
  ],
  theme: {
    extend: {
      fontFamily: {
        poppins: ['Poppins', ...defaultTheme.fontFamily.sans],
      },
    },
    container: {
      center: true,
    },
  },
  plugins: [],
};
