import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dbe6ff',
          500: '#3b6cf6',
          600: '#2d56d6',
          700: '#2545ad',
        },
      },
    },
  },
  plugins: [],
};

export default config;
