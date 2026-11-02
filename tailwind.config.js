/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './App.tsx', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        yt: {
          black: 'var(--yt-black)',
          dark: 'var(--yt-dark)',
          red: 'var(--yt-red)',
          brand: 'var(--yt-brand)',
          text: '#f1f1f1',
          gray: '#aaaaaa'
        }
      }
    }
  },
  plugins: []
};
