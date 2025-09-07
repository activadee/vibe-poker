/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef2f9',
          100: '#e3e8f3',
          200: '#c8d3e7',
          300: '#a1b5d6',
          400: '#7390bf',
          500: '#3f689f',
          600: '#2f507d',
          700: '#253f62',
          800: '#1f344f',
          900: '#1a2a40',
          DEFAULT: '#1f344f',
        },
        surface: {
          DEFAULT: '#ffffff',
          faint: '#f8fafc',
          muted: '#f1f5f9',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.06)',
      },
      borderRadius: {
        xl: '12px',
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'Noto Sans',
          'Apple Color Emoji',
          'Segoe UI Emoji',
          'Segoe UI Symbol',
          'Noto Color Emoji',
        ],
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};

