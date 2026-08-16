/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0F766E',
          dark: '#115E59',
          light: '#14B8A6',
        },
        mint: '#DFF5EF',
        surface: '#F7FAF9',
        ink: {
          DEFAULT: '#1F2937',
          muted: '#64748B',
        },
        line: '#E5E7EB',
        success: {
          DEFAULT: '#16A34A',
          bg: '#DCFCE7',
        },
        warning: {
          DEFAULT: '#B45309',
          bg: '#FEF3C7',
        },
        danger: {
          DEFAULT: '#DC2626',
          bg: '#FEE2E2',
        },
      },
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      borderRadius: {
        card: '16px',
        control: '10px',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.06)',
        pop: '0 8px 24px rgba(15, 23, 42, 0.10)',
      },
      maxWidth: {
        content: '1160px',
      },
    },
  },
  plugins: [],
};
