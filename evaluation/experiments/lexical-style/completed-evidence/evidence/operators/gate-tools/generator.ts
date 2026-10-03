import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import * as controlApi from "/Users/ryanbetts/.codex/worktrees/linguistic-q11b-control/word-generator/src/index.js";
import * as candidateApi from "/Users/ryanbetts/.codex/worktrees/linguistic-q20-style/word-generator/src/index.js";
import type { LanguageConfig } from "/Users/ryanbetts/.codex/worktrees/linguistic-q20-style/word-generator/src/config/language.js";
import type { WordGenerationOptions } from "/Users/ryanbetts/.codex/worktrees/linguistic-q20-style/word-generator/src/types.js";

const arm = process.env.Q20_GATE_ARM;
const policy = process.env.Q20_SPELLING_POLICY;
assert(arm === "control" || arm === "candidate");
assert(policy === "default" || policy === "active");
const api = arm === "control" ? controlApi : candidateApi;
const configuration: LanguageConfig = structuredClone(api.englishConfig);
if (policy === "active") {
  const bytes = readFileSync("/Users/ryanbetts/.codex/worktrees/linguistic-q20-style/word-generator/evaluation/experiments/final-word-ownership/measurement.json");
  assert.equal(createHash("sha256").update(bytes).digest("hex"), "7ee6193f4e5e5c9f79bcef9485bdc50e7df4202f0527e97f9c00459e3adeebf1");
  const active = (JSON.parse(bytes.toString()) as { configuration: LanguageConfig }).configuration;
  configuration.splitVowels = active.splitVowels;
  configuration.followingLetters = active.followingLetters;
}
if (arm === "candidate") configuration.lexicalStyle = structuredClone(candidateApi.englishStyleExperiment);
const generator = api.createGenerator(configuration);
export const generateWord = generator.generateWord;

// Both arms use the same public single-word adapter. Native default batches
// are timed separately; per-word validation is part of this configured workload.
export function generateWords(count: number, options: WordGenerationOptions = {}) {
  if (!Number.isInteger(count) || count < 0 || count > 1_000_000) throw new RangeError("Unsupported benchmark batch count.");
  const rand = options.rand ?? (options.seed !== undefined ? api.createSeededRng(options.seed) : api.createDefaultRng());
  const words = [];
  for (let index = 0; index < count; index++) words.push(generator.generateWord({ ...options, rand }));
  return words;
}
