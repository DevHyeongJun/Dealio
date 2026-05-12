import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Pretendard Variable',
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'Apple SD Gothic Neo',
          'Malgun Gothic',
          'system-ui',
          'sans-serif',
        ],
      },
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dbe6ff',
          200: '#bfd3ff',
          300: '#94b1fc',
          400: '#6489f9',
          500: '#3b6cf6',
          600: '#2d56d6',
          700: '#2545ad',
          800: '#1b337e',
          900: '#142557',
          950: '#0a132f',
        },
      },
    },
  },
  plugins: [],
};

export default config;
