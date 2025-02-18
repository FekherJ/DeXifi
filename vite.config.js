import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: './', // Ensures the root directory is used
  build: {
    outDir: 'dist', // Adjust if your build directory is different
    emptyOutDir: true, // Ensures old files are deleted before new build
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'), // Example alias for easy imports
    },
  },
  server: {
    port: 5173, // Default port for Vite, change if needed
    open: true, // Auto-opens the browser when running dev server
  }
});