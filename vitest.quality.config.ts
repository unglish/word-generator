import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/core/quality.test.ts'],
    environment: 'node',
    testTimeout: 120_000,
  },
})
