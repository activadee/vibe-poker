/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{html,ts}',
    // Fallback if cwd differs
    './apps/web/src/**/*.{html,ts}',
  ],
  safelist: [
    // Layout
    'min-h-screen','flex','items-start','items-center','justify-center','justify-between','py-24','px-4','mb-6','mt-1','mt-3','mt-4','mb-8','block','w-full',
    // Typography
    'text-2xl','text-base','text-sm','font-semibold','font-medium','tracking-tight',
    'text-slate-900','text-slate-700','text-slate-600','text-slate-500','text-red-600','text-white',
    // Surfaces
    'bg-white','bg-slate-100','bg-transparent','bg-surface','bg-surface-faint','bg-primary-900','hover:bg-primary-800',
    // Borders & radius & shadow
    'border','border-slate-200','rounded-md','rounded-xl','rounded-full','shadow-card','shadow-sm',
    // Buttons sizing
    'h-9','h-10','h-11','px-3','px-4','px-5',
    // Focus styles
    'focus-visible:outline-2','focus-visible:outline-offset-2','focus-visible:outline-primary-600','focus-visible:outline-primary-700',
  ],
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
