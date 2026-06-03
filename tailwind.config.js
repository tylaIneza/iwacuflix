/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: { red: '#E50914', dark: '#0a0a0a', card: '#141414', elevated: '#1c1c1c', border: '#2a2a2a' },
      },
      animation: {
        'fade-up':    'fadeInUp 0.45s ease both',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        shimmer:      'shimmer 1.4s infinite',
        spin:         'spin 0.8s linear infinite',
      },
      backgroundSize: { '700': '700px 100%' },
    },
  },
  plugins: [],
};
