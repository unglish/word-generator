import { build, defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, __dirname, 'VITE_REVIEW_'), ...process.env };
  const key = env.VITE_REVIEW_SUPABASE_PUBLISHABLE_KEY || '';
  let privileged = key.startsWith('sb_secret_');
  if (key.split('.').length === 3) {
    try {
      privileged ||= JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role !== 'anon';
    } catch {
      throw new Error('The reviewer key is not a valid publishable or anonymous key.');
    }
  }
  if (privileged) throw new Error('An owner secret must never be included in the reviewer build. Use the publishable key.');
  return {
  base: './',
  plugins: [{
    name: 'standalone-classic-worker',
    async generateBundle() {
      // Existing importScripts consumers require one standalone classic script.
      const built = await build({
        configFile: false,
        logLevel: 'warn',
        build: {
          write: false,
          lib: { entry: resolve(__dirname, 'src/worker-entry.js'), name: 'unglishWorker', formats: ['iife'] },
        },
      });
      const outputs = Array.isArray(built) ? built : [built];
      const chunk = outputs.flatMap(result => result.output).find(output => output.type === 'chunk');
      if (!chunk) throw new Error('Classic worker build produced no script');
      this.emitFile({ type: 'asset', fileName: 'unglish-worker.js', source: chunk.code });
    },
  }],
  root: 'demo',
  envDir: resolve(__dirname),
  server: {
    allowedHosts: ['unglish.exe.xyz'],
  },
  build: {
    outDir: '../dist-demo',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'demo/index.html'),
        review: resolve(__dirname, 'demo/review.html'),
        repairPilot: resolve(__dirname, 'demo/repair-pilot.html'),
      },
      output: {
        entryFileNames: '[name].js',
      }
    }
  }
  };
});
