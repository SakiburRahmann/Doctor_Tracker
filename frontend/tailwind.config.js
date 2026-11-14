/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}', './lib/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // App canvas (tinted, cooler than white so cards read as raised).
        canvas: '#F6F8FA',
        // Cool neutral ramp (Geist-style: 200 border -> 300 hover border -> 400 icons -> 500 secondary text).
        mist: {
          50: '#F8FAFB',
          100: '#F1F4F6',
          150: '#EAEFF2',
          200: '#E2E8EC',
          300: '#CBD5DB',
          400: '#96A2AB',
          500: '#64707A',
          600: '#49535C',
          700: '#39424A',
          800: '#283036',
          900: '#1A2228',
        },
        // Single accent: clinical petrol teal. Primary actions, links, focus, primary series.
        sea: {
          50: '#F0FAF9',
          100: '#D9F2EF',
          200: '#B4E5E0',
          300: '#85D2CB',
          400: '#52B5AE',
          500: '#2E9B94',
          600: '#1F817B',
          700: '#1B6863',
          800: '#175350',
          900: '#13423F',
          950: '#0A2725',
        },
        // Chart secondary + "attention" tints.
        amber: {
          50: '#FDF6EC',
          100: '#F8E8CC',
          200: '#F1CF92',
          500: '#D97D20',
          600: '#C06514',
          700: '#9A5010',
        },
        // Destructive / critical only.
        rose: {
          50: '#FDF1F1',
          100: '#FBDADA',
          200: '#F5B8B8',
          600: '#CE4141',
          700: '#B03030',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jbmono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        // Layered, translucent, cool-tinted (never a gray halo).
        xs: '0 1px 2px rgba(16, 24, 40, 0.05)',
        card: '0 1px 2px rgba(16, 24, 40, 0.04), 0 2px 8px -2px rgba(16, 24, 40, 0.06)',
        'card-hover': '0 2px 4px rgba(16, 24, 40, 0.04), 0 8px 20px -4px rgba(16, 24, 40, 0.10)',
        overlay: '0 4px 10px rgba(16, 24, 40, 0.08), 0 16px 40px -8px rgba(16, 24, 40, 0.18)',
        glow: '0 2px 10px -2px rgba(31, 129, 123, 0.45)',
      },
    },
  },
  plugins: [],
};
