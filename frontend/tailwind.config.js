/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}', './lib/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Warm paper-and-ink neutrals (registry paper, not cool slate).
        paper: '#F6F4F0',
        sand: {
          50: '#F8F7F3',
          100: '#F1EFEA',
          200: '#E9E5DC',
          300: '#DDD8CB',
          400: '#B4AF9F',
          500: '#8F8B7E',
          600: '#6E6A5E',
        },
        ink: {
          900: '#272B24',
          800: '#3C413A',
          700: '#4F544B',
          600: '#6E6A5E',
        },
        hairline: '#E4E0D6',
        'hairline-strong': '#D4CFC2',
        // Single accent: deep clinical spruce. Used for primary actions, links, focus.
        spruce: {
          50: '#EEF4F0',
          100: '#DBE9E0',
          200: '#B9D5C3',
          300: '#8FB8A1',
          400: '#5E9275',
          500: '#3A7A57',
          600: '#24644B',
          700: '#1C5A45',
          800: '#154538',
          900: '#10362E',
        },
        // Secondary data color for two-series charts (never purple/indigo).
        rust: {
          100: '#F3E4D8',
          500: '#B4632C',
          600: '#A55A28',
          700: '#8C4A20',
        },
        // Destructive only.
        brick: {
          50: '#F7E9E8',
          200: '#E3BFBC',
          600: '#A13434',
          700: '#8A2B2B',
        },
      },
      fontFamily: {
        sans: ['var(--font-plex-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-plex-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        // Reserved for overlays (modals, mobile drawer) only; surfaces use hairlines.
        raised: '0 12px 32px rgba(39, 43, 36, 0.14)',
      },
    },
  },
  plugins: [],
};
