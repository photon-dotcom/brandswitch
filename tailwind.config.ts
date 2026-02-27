import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brandswitch design tokens
        'bs-dark':        '#1a1a18',  // Near-black — headings, logo
        'bs-bg':          '#f5f5f0',  // Warm off-white — page background
        'bs-teal':        '#4a9982',  // Teal accent — CTAs, highlights
        'bs-teal-dark':   '#3d8270',  // Teal hover state
        'bs-teal-light':  '#e8f3f0',  // Teal tint — chip backgrounds
        'bs-gray':        '#9a9a92',  // Mid gray — secondary text
        'bs-border':      '#e4e4de',  // Subtle border
      },
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'DM Sans', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(26,26,24,0.06), 0 1px 2px rgba(26,26,24,0.04)',
        'card-hover': '0 4px 12px rgba(26,26,24,0.10), 0 2px 4px rgba(26,26,24,0.06)',
      },
    },
  },
  plugins: [],
};

export default config;
