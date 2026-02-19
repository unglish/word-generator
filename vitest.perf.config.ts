import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.perf.test.ts'],
    environment: 'node',
    fileParallelism: false,
    maxWorkers: 1,
  },
})
