import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['/Users/ryanbetts/.codex/worktrees/d9c28566-8f5b-432e-a246-5e4070782624/word-generator/.local-evidence/running-text-frequency/gate-tools/quality.test.ts'],
    environment: 'node',
    testTimeout: 120_000,
  },
})
