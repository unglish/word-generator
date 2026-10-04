import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { countsFor } from "./analyze-archive.mjs";
const words = JSON.parse(gunzipSync(await readFile("/Users/ryanbetts/.codex/worktrees/linguistic-q02-resumed/word-generator/evaluation/experiments/final-word-ownership/recount-smoke-words.json.gz")));
assert.equal(words.length, 100);
await writeFile("/private/tmp/q02-production-counter-smoke.json", JSON.stringify(words.map(countsFor)));
