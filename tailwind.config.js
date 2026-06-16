/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f3f5f9',
          100: '#e4e9f2',
          200: '#c5cee0',
          300: '#9aa7c0',
          400: '#6b7a99',
          500: '#475774',
          600: '#2f3e5e',
          700: '#1d2b48',
          800: '#101e3a',
          900: '#0a1530',
          950: '#050b1e',
        },
        rail: {
          DEFAULT: '#C8102E',
          dark: '#9b0c24',
          light: '#e63a55',
        },
      },
      fontFamily: {
        display: ['Barlow', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(10,21,48,0.04), 0 4px 12px rgba(10,21,48,0.06)',
      },
    },
  },
  plugins: [],
};
