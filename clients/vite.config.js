import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
      extensions: ['.js', '.jsx'],
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:8001',
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            console.log('[ViteConfig:Proxy] Proxy configured for /api');
            proxy.on('error', (err) => {
              console.error('[ViteConfig:Proxy] /api error:', err.message);
            });
            proxy.on('proxyReq', (proxyReq, req) => {
              console.log('[ViteConfig:Proxy] /api request:', req.url);
            });
          },
        },
        '/socket.io': {
          target: env.VITE_API_URL || 'http://localhost:8001',
          ws: true,
          changeOrigin: true,
          rewrite: (path) => {
            console.log('[ViteConfig:Proxy] Rewriting path:', path);
            return path;
          },
          configure: (proxy) => {
            console.log('[ViteConfig:Proxy] Proxy configured for /socket.io');
            proxy.on('error', (err) => {
              console.error('[ViteConfig:Proxy] /socket.io error:', err.message);
            });
            proxy.on('proxyReq', (proxyReq, req) => {
              console.log('[ViteConfig:Proxy] /socket.io request:', req.url);
            });
          },
        },
      },
    },
  };
});