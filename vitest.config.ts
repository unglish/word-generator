import { defineConfig } from 'vitest/config'

const isCI = process.env.CI === 'true'

export default defineConfig({
  test: {
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['src/**/quality.test.ts', 'src/**/*.perf.test.ts', '**/node_modules/**'],
    environment: 'node',
    // CI stability: avoid intermittent worker RPC timeout ("onTaskUpdate")
    // seen under heavy parallel CPU contention.
    fileParallelism: !isCI,
    maxWorkers: isCI ? 1 : undefined,
  },
})
