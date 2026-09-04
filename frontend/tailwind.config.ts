import type { Config } from 'tailwindcss';

/**
 * Tailwind config mirrors :root in /Website/index.html:11-24
 * and admin extras in /Website/admin.html:11-28.
 * See src/lib/tokens/* for the TS twin of these values.
 */
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#FFFFFF',
        sand: '#FFF8EE',
        sun: { DEFAULT: '#FFA61C', dark: '#e0900e' },
        ink: { DEFAULT: '#000000', soft: '#232323' },
        line: 'rgba(0,0,0,0.12)',
        // admin-only
        good: '#1E8E5A',
        warn: '#B5790A',
        bad: '#C43B3B',
      },
      fontFamily: {
        script: ['Yellowtail', 'cursive'],
        cine: ['Fraunces', 'serif'],
        body: ['Inter', 'sans-serif'],
        eyebrow: ['Poppins', 'sans-serif'],
        brand: ['LemonadoScript', 'ShinanoItalic', 'Yellowtail', 'cursive'],
      },
      maxWidth: { wrap: '1240px' },
      borderRadius: { card: '16px', pill: '100px', shell: '10px' },
      spacing: { section: '120px' },
      boxShadow: {
        card: '0 2px 14px rgba(0,0,0,0.05)',
        cardHover: '0 24px 44px rgba(0,0,0,0.16)',
        waFloat: '0 10px 26px rgba(0,0,0,0.25)',
      },
      keyframes: {
        scrollmove: {
          '0%': { top: '-14px' },
          '100%': { top: '44px' },
        },
        'wa-pulse': {
          '0%': { transform: 'scale(1)', opacity: '.55' },
          '70%': { transform: 'scale(1.7)', opacity: '0' },
          '100%': { opacity: '0' },
        },
        dashfade: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        scrollmove: 'scrollmove 2.2s ease-in-out infinite',
        'wa-pulse': 'wa-pulse 2.2s ease-out infinite',
        dashfade: 'dashfade .35s ease',
      },
    },
  },
  plugins: [],
};

export default config;
