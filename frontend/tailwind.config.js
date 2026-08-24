function withOpacity(varName) {
  return ({ opacityValue }) =>
    opacityValue === undefined ? `rgb(var(${varName}))` : `rgb(var(${varName}) / ${opacityValue})`;
}

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: withOpacity('--color-canvas'),
        surface: {
          DEFAULT: withOpacity('--color-surface'),
          muted: withOpacity('--color-surface-muted'),
        },
        primary: {
          DEFAULT: withOpacity('--color-primary'),
          dark: withOpacity('--color-primary-dark'),
          light: withOpacity('--color-primary-light'),
        },
        mint: withOpacity('--color-mint'),
        ink: {
          DEFAULT: withOpacity('--color-ink'),
          muted: withOpacity('--color-ink-muted'),
        },
        line: withOpacity('--color-line'),
        success: {
          DEFAULT: withOpacity('--color-success'),
          bg: withOpacity('--color-success-bg'),
        },
        warning: {
          DEFAULT: withOpacity('--color-warning'),
          bg: withOpacity('--color-warning-bg'),
        },
        danger: {
          DEFAULT: withOpacity('--color-danger'),
          bg: withOpacity('--color-danger-bg'),
        },
      },
      fontFamily: {
        sans: [
          'Manrope',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        display: ['Syne', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        quote: ['Fraunces', 'Georgia', 'Times New Roman', 'serif'],
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
