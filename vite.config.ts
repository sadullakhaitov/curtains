import { defineConfig } from 'vite';

// `npm run build`          → dist/          normal static site (any HTTPS host).
// `npm run build:artifact` → dist-artifact/ one classic script + one stylesheet, for hosts that
//                            sandbox the page and cannot load ES-module chunks (e.g. a claude.ai page).
export default defineConfig(({ mode }) =>
  mode === 'artifact'
    ? {
        base: './',
        build: {
          outDir: 'dist-artifact',
          target: 'es2019',
          cssCodeSplit: false,
          assetsInlineLimit: 0,
          modulePreload: false,
          rollupOptions: {
            output: {
              format: 'iife',
              inlineDynamicImports: true,
              entryFileNames: 'assets/app.js',
              assetFileNames: 'assets/[name][extname]',
            },
          },
        },
      }
    : {
        // `base: './'` lets the built site work from any sub-path (GitHub Pages, a CDN folder, etc.).
        base: './',
        build: { target: 'es2019', cssCodeSplit: false, assetsInlineLimit: 0 },
      },
);
