import { defineConfig } from 'vite';

// `base: './'` so the static build works from any GitHub Pages subpath.
export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? './',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: { phaser: ['phaser'] },
      },
    },
  },
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
});
