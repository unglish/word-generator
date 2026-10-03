import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createGenerator, createSeededRng, createDefaultRng, englishConfig } from "/Users/ryanbetts/.codex/worktrees/linguistic-q19-frequency/word-generator/src/index.ts";
import { createFrequencyTextConfig } from "/Users/ryanbetts/.codex/worktrees/linguistic-q19-frequency/word-generator/evaluation/corpus/frequency-runtime.ts";
import type { FrequencyCounts } from "/Users/ryanbetts/.codex/worktrees/linguistic-q19-frequency/word-generator/evaluation/corpus/frequency-model.ts";

const arm = process.env.Q19_GATE_ARM;
assert(arm === "control" || arm === "candidate");
const bytes = readFileSync("/private/tmp/q19-registered-fit-v1/artifact.json");
assert.equal(createHash("sha256").update(bytes).digest("hex"), "3d5774fde07d051222ad090bedef963bca0f5427596cb98b9404c22415db16fc");
const fit = JSON.parse(bytes.toString()) as { models: { candidate: FrequencyCounts } };
const configured = arm === "candidate" ? createFrequencyTextConfig(englishConfig, fit.models.candidate).config : englishConfig;
const generator = createGenerator(configured);
export const generateWord = generator.generateWord;
// This dependency exposes only the configured single-word API.
export function generateWords(count: number, options: import("/Users/ryanbetts/.codex/worktrees/linguistic-q19-frequency/word-generator/src/types.ts").WordGenerationOptions = {}) {
  if (!Number.isInteger(count) || count < 0 || count > 1_000_000) throw new RangeError("Unsupported benchmark batch count.");
  const rand = options.rand ?? (options.seed !== undefined ? createSeededRng(options.seed) : createDefaultRng());
  const words = [];
  for (let index = 0; index < count; index++) words.push(generator.generateWord({ ...options, rand }));
  return words;
}
