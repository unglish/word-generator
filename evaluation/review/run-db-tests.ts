import { spawnSync } from "node:child_process";
import { localEnvironment } from "./local-environment.js";

try {
  const { url, secret, publishable } = localEnvironment();
  const result = spawnSync("npx", ["vitest", "run", "--config", "vitest.review-db.config.ts"], {
    stdio: "inherit", env: { ...process.env, REVIEW_TEST_URL: url, REVIEW_TEST_SECRET: secret, REVIEW_TEST_KEY: publishable },
  });
  process.exitCode = result.status ?? 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : "Database tests failed.");
  process.exitCode = 1;
}
