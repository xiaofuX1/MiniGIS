import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { copyFileSync, readFileSync } from 'fs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'splash-html-handler',
      // 开发环境：提供 splash.html 服务
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/splash.html') {
            res.setHeader('Content-Type', 'text/html');
            res.end(readFileSync('splash.html', 'utf-8'));
            return;
          }
          next();
        });
      },
      // 生产环境：构建完成后复制 splash.html 到 dist 目录
      closeBundle() {
        try {
          copyFileSync('splash.html', 'dist/splash.html');
          console.log('✓ splash.html 已复制到 dist 目录');
        } catch (e) {
          console.error('复制 splash.html 失败:', e);
        }
      }
    }
  ],
  clearScreen: false,
  server: {
    port: 5175,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: ['es2021', 'chrome100', 'safari13'],
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@stores': path.resolve(__dirname, './src/stores'),
      '@services': path.resolve(__dirname, './src/services'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@types': path.resolve(__dirname, './src/types'),
      '@assets': path.resolve(__dirname, './src/assets'),
    },
  },
});
