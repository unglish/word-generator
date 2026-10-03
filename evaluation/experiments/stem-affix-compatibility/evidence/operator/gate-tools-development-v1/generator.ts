import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import * as controlApi from "/Users/ryanbetts/.codex/worktrees/linguistic-q11b-control/word-generator/src/index.ts";
import * as candidateApi from "/Users/ryanbetts/.codex/worktrees/linguistic-q18-categories/word-generator/src/index.ts";
import type { MorphologyCategories } from "/Users/ryanbetts/.codex/worktrees/linguistic-q18-categories/word-generator/src/config/language.ts";
import type { WordGenerationOptions } from "/Users/ryanbetts/.codex/worktrees/linguistic-q18-categories/word-generator/src/types.ts";

const arm = process.env.Q18_GATE_ARM;
assert(arm === "control" || arm === "candidate");
const bytes = readFileSync("/Users/ryanbetts/.codex/worktrees/linguistic-q18-categories/word-generator/evaluation/experiments/stem-affix-compatibility/experimental-profile.json");
assert.equal(createHash("sha256").update(bytes).digest("hex"), "51750a29cbfe89d6d9cc6c7b9fd5ab67ee9e8ec0d9203f00f2b52e3a6c0ee266");
const profile = JSON.parse(bytes.toString()) as { model: MorphologyCategories };
const configuration = structuredClone(candidateApi.englishConfig);
configuration.morphology!.categories = profile.model;
const generator = arm === "control" ? controlApi.createGenerator(controlApi.englishConfig)
  : candidateApi.createGenerator(configuration);
const api = arm === "control" ? controlApi : candidateApi;

export const generateWord = generator.generateWord;

// Both arms use this same public single-word adapter. Native default batches
// are timed separately; per-word validation is part of this configured workload.
export function generateWords(count: number, options: WordGenerationOptions = {}) {
  if (!Number.isInteger(count) || count < 0 || count > 1_000_000) throw new RangeError("Unsupported benchmark batch count.");
  const rand = options.rand ?? (options.seed !== undefined ? api.createSeededRng(options.seed) : api.createDefaultRng());
  const words = [];
  for (let index = 0; index < count; index++) words.push(generator.generateWord({ ...options, rand }));
  return words;
}
