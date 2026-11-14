import { defineConfig } from 'vite';

// Relative base so the build works on GitHub Pages under /<repo>/ as well as on Vercel.
export default defineConfig({
  base: './',
});
