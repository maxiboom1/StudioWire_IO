/** @type {import('tailwindcss').Config} */
import tailwindcssAnimate from 'tailwindcss-animate';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        studio: {
          bg: 'var(--studio-bg)',
          panel: 'var(--studio-panel)',
          border: 'var(--studio-border)',
          text: 'var(--studio-text)',
          muted: 'var(--studio-muted)',
          accent: 'var(--studio-accent)',
          success: 'var(--studio-success)',
        },
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
