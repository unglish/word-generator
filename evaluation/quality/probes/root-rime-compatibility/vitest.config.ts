import { defineConfig } from "vitest/config";
export default defineConfig({ test: { include: ["evaluation/quality/probes/root-rime-compatibility/*.test.ts"], pool: "threads", fileParallelism: false, maxWorkers: 1, testTimeout: 60000 } });
