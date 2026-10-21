#!/usr/bin/env node
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

// Retain the direct Node entrypoint; use the existing public tsx loader export.
const require = createRequire(import.meta.url);
const child = spawnSync(process.execPath, [
  "--import", pathToFileURL(require.resolve("tsx")).href,
  fileURLToPath(new URL("../evaluation/corpus/phoneme-cli.ts", import.meta.url)),
  ...process.argv.slice(2),
], { stdio: "inherit" });
if (child.error) throw child.error;
process.exitCode = child.status ?? 1;
