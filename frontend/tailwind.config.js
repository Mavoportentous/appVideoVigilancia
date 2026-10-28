/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1B2420',
        paper: '#F2F5F1',
        pine: { DEFAULT: '#1F5C4A', dark: '#154235' },
        sun: '#E8B04A',
        signal: '#C8452F',
      },
      fontFamily: {
        sans: ['"Atkinson Hyperlegible"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
