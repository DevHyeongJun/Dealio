/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  basePath: '/dealio',
  // puppeteer 는 chromium 바이너리를 fs 로 spawn 하므로 Next.js 의 webpack 번들링 우회
  experimental: {
    serverComponentsExternalPackages: ['puppeteer', 'puppeteer-core'],
  },
  // CORS 는 src/middleware.ts 에서 동적으로 처리 (origin 별 echo + credentials 지원).
};

module.exports = nextConfig;
