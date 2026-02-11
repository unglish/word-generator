import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: './',
  root: 'demo',
  server: {
    allowedHosts: ['unglish.exe.xyz'],
  },
  build: {
    outDir: '../dist-demo',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'demo/index.html'),
        worker: resolve(__dirname, 'src/worker-entry.js')
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'worker') {
            return 'unglish-worker.js';
          }
          return '[name].js';
        }
      }
    }
  }
});
