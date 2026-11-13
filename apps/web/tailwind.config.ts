import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef8f4',
          100: '#d8eee6',
          200: '#b3ddcd',
          300: '#7fc4ab',
          400: '#4aa487',
          500: '#2b8a6c',
          600: '#0f6e56',
          700: '#0c5744',
          800: '#0b4638',
          900: '#093a30',
          950: '#04211b',
        },
        signal: {
          DEFAULT: 'var(--signal)',
          soft: 'var(--signal-soft)',
          ink: 'var(--signal-ink)',
        },
        surface: {
          DEFAULT: 'var(--surface)',
          muted: 'var(--surface-muted)',
          elevated: 'var(--surface-elevated)',
        },
        ink: {
          DEFAULT: 'var(--ink)',
          muted: 'var(--ink-muted)',
        },
        line: 'var(--line)',
      },
      fontFamily: {
        sans: ['var(--font-source-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-syne)', 'var(--font-source-sans)', 'sans-serif'],
        mono: ['var(--font-ibm-plex-mono)', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        soft: 'var(--shadow-soft)',
      },
      borderRadius: {
        control: 'var(--radius-control)',
        panel: 'var(--radius-panel)',
      },
    },
  },
  plugins: [],
};

export default config;
