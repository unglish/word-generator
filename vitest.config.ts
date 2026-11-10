import { defineConfig } from 'vitest/config'

const isCI = process.env.CI === 'true'
const strictUnhandled = process.env.STRICT_UNHANDLED_ERRORS === '1'

export default defineConfig({
  test: {
    // Avoid intermittent birpc timeout flake ("onTaskUpdate") seen in forks pool.
    pool: 'threads',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}', 'scripts/lib/phoneme-calibration.test.ts', 'evaluation/quality/**/*.test.ts'],
    exclude: ['src/**/*.perf.test.ts', '**/node_modules/**'],
    environment: 'node',
    // Files run in parallel on CI too. CI used to be forced to one worker to
    // dodge a worker-RPC timeout ("onTaskUpdate"). Re-checked 2026-11-10 (#377):
    // 10 parallel runs on ubuntu-latest (4 vCPU), 5 of them with
    // STRICT_UNHANDLED_ERRORS=1, all passed with no RPC or unhandled errors,
    // and `npm test` dropped from 289-505 s serial to 165-318 s.
    // Extend timeouts for long-running statistical tests
    testTimeout: isCI ? 120_000 : 60_000,
    teardownTimeout: isCI ? 30_000 : 10_000,
    // Suppress vitest 3.x worker RPC "onTaskUpdate" timeout flake.
    // Enable strict mode with STRICT_UNHANDLED_ERRORS=1 when debugging.
    dangerouslyIgnoreUnhandledErrors: !strictUnhandled,
  },
})
