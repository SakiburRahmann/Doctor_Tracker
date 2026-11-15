/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}', './lib/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Semantic surfaces — every value is a CSS variable so the whole app
        // flips cleanly between the light and dark theme.
        canvas: 'rgb(var(--canvas) / <alpha-value>)',
        chrome: 'rgb(var(--chrome) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--surface-2) / <alpha-value>)',
        'surface-3': 'rgb(var(--surface-3) / <alpha-value>)',
        panel: {
          DEFAULT: 'rgb(var(--panel) / <alpha-value>)',
          2: 'rgb(var(--panel-2) / <alpha-value>)',
        },
        data: {
          DEFAULT: 'rgb(var(--data) / <alpha-value>)',
          2: 'rgb(var(--data-2) / <alpha-value>)',
        },
        detail: {
          DEFAULT: 'rgb(var(--detail) / <alpha-value>)',
          2: 'rgb(var(--detail-2) / <alpha-value>)',
        },
        line: 'rgb(var(--line) / <alpha-value>)',
        'line-strong': 'rgb(var(--line-strong) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        'ink-2': 'rgb(var(--ink-2) / <alpha-value>)',
        'ink-3': 'rgb(var(--ink-3) / <alpha-value>)',
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          hover: 'rgb(var(--accent-hover) / <alpha-value>)',
          soft: 'rgb(var(--accent-soft) / <alpha-value>)',
          ink: 'rgb(var(--accent-ink) / <alpha-value>)',
          strong: 'rgb(var(--accent-strong) / <alpha-value>)',
        },
        danger: {
          DEFAULT: 'rgb(var(--danger) / <alpha-value>)',
          soft: 'rgb(var(--danger-soft) / <alpha-value>)',
        },
        warn: {
          DEFAULT: 'rgb(var(--warn) / <alpha-value>)',
          soft: 'rgb(var(--warn-soft) / <alpha-value>)',
        },
        ok: {
          DEFAULT: 'rgb(var(--ok) / <alpha-value>)',
          soft: 'rgb(var(--ok-soft) / <alpha-value>)',
        },
        night: {
          DEFAULT: 'rgb(var(--night) / <alpha-value>)',
          ink: 'rgb(var(--night-ink) / <alpha-value>)',
          line: 'rgb(var(--night-line) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jbmono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        card: '24px',
        inner: '16px',
      },
      boxShadow: {
        // Barely-there elevation: the border does most of the work.
        xs: '0 1px 2px rgba(16, 24, 40, 0.04)',
        soft: '0 1px 2px rgba(16, 24, 40, 0.03), 0 8px 24px -16px rgba(16, 24, 40, 0.16)',
        pop: '0 8px 30px -12px rgba(16, 24, 40, 0.24), 0 2px 6px rgba(16, 24, 40, 0.05)',
        accent: '0 6px 18px -8px rgba(158, 199, 60, 0.65)',
      },
      keyframes: {
        rise: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fade: { from: { opacity: '0' }, to: { opacity: '1' } },
      },
      animation: {
        rise: 'rise 0.4s cubic-bezier(0.22, 1, 0.36, 1) both',
        fade: 'fade 0.2s ease-out both',
      },
    },
  },
  plugins: [],
};
