import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  base: '/dealio/',
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/dealio/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:4000',
        changeOrigin: true,
        // xfwd=true → http-proxy 가 X-Forwarded-For/Host/Proto 헤더를 자동으로 추가하므로
        // 백엔드의 clientIp() 가 docker IP 대신 실제 클라이언트 IP 를 읽을 수 있다.
        xfwd: true,
      },
    },
  },
});
