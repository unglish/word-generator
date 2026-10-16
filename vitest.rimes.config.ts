import { defineConfig } from "vitest/config";
export default defineConfig({ test: { include: ["evaluation/quality/probes/ae-ng-rimes.test.ts"], environment: "node", testTimeout: 30_000 } });
