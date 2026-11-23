import { defineConfig } from 'vite';

// `base: './'` lets the built site work from any sub-path (GitHub Pages, a CDN folder, etc.).
export default defineConfig({
  base: './',
  build: {
    target: 'es2019',
    cssCodeSplit: false,
    assetsInlineLimit: 0,
  },
});
