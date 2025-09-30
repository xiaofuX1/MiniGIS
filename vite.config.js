import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: ['es2021', 'chrome100', 'safari13'],
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
  server: {
    port: 5173,
    strictPort: false,
  },
  clearScreen: false,
  envPrefix: ['VITE_', 'TAURI_'],
});
