import { defineConfig } from 'vitest/config'

const isCI = process.env.CI === 'true'
const strictUnhandled = process.env.STRICT_UNHANDLED_ERRORS === '1'

export default defineConfig({
  test: {
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['src/**/quality.test.ts', 'src/**/*.perf.test.ts', '**/node_modules/**'],
    environment: 'node',
    // CI stability: avoid intermittent worker RPC timeout ("onTaskUpdate")
    // seen under heavy parallel CPU contention.
    fileParallelism: !isCI,
    maxWorkers: isCI ? 1 : undefined,
    // Extend timeouts for long-running statistical tests
    testTimeout: isCI ? 120_000 : 60_000,
    teardownTimeout: isCI ? 30_000 : 10_000,
    // Suppress vitest 3.x worker RPC "onTaskUpdate" timeout flake.
    // Enable strict mode with STRICT_UNHANDLED_ERRORS=1 when debugging.
    dangerouslyIgnoreUnhandledErrors: !strictUnhandled,
  },
})
