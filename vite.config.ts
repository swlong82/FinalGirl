import { defineConfig } from 'vite';

// Relative base so the build works on GitHub Pages (/<repo>/) or any static host.
export default defineConfig({
  base: './',
  build: { outDir: 'dist', assetsInlineLimit: 0 },
  test: { globals: true, environment: 'node' },
} as any);
