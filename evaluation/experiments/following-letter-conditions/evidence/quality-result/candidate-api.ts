import { createGenerator, englishConfig, createSeededRng } from "/Users/ryanbetts/.codex/worktrees/linguistic-spelling/word-generator/src/index.ts";
import { readFileSync } from "node:fs";
const measurement = JSON.parse(readFileSync("/Users/ryanbetts/.codex/worktrees/linguistic-spelling/word-generator/evaluation/experiments/following-letter-conditions/measurement.json", "utf8"));
const generator = createGenerator({ ...englishConfig, splitVowels: measurement.splitVowels, followingLetters: measurement.followingLetters });
export const generateWord = generator.generateWord;
export function generateWords(count, options) {
  const rand = options.rand ?? createSeededRng(options.seed);
  return Array.from({length:count}, () => generateWord({ ...options, rand }));
}
