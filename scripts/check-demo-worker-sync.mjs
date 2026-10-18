import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";

function readFileOrThrow(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required file: ${filePath}`);
  }
  return fs.readFileSync(filePath);
}

function buildFreshWorker(rootDir) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "unglish-demo-worker-"));
  try {
    const result = spawnSync(
      "npx",
      ["vite", "build", "--config", "vite.config.js", "--outDir", tempDir],
      {
        cwd: rootDir,
        stdio: "inherit",
      },
    );
    if (result.status !== 0) {
      throw new Error("Unable to build demo worker for sync verification");
    }
    return {
      workerPath: path.join(tempDir, "unglish-worker.js"),
      cleanup() {
        fs.rmSync(tempDir, { recursive: true, force: true });
      },
    };
  } catch (error) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    throw error;
  }
}

async function main() {
  const rootDir = process.cwd();
  const demoWorker = path.join(rootDir, "demo", "unglish-worker.js");
  const builtWorker = buildFreshWorker(rootDir);

  try {
    const demoBuffer = readFileOrThrow(demoWorker);
    const builtBuffer = readFileOrThrow(builtWorker.workerPath);
    if (!demoBuffer.equals(builtBuffer)) {
      throw new Error("demo/unglish-worker.js is stale relative to the current build output. Run `npm run build`.");
    }
  } finally {
    builtWorker.cleanup();
  }

  if (fs.existsSync(path.join(rootDir, "dist", "wasm", "manifest.json"))) {
    await import("./check-repair-wasm.mjs");
  }
  console.log("demo worker is in sync");
}

await main();
