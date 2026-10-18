import { createGenerator, englishConfig, createSeededRng } from "/Users/ryanbetts/.codex/worktrees/linguistic-q02-publication/word-generator/src/index.ts";
import { readFileSync } from "node:fs";
const registration = JSON.parse(readFileSync("/Users/ryanbetts/.codex/worktrees/linguistic-q02-publication/word-generator/evaluation/experiments/final-word-ownership/measurement.json", "utf8"));
const generator = createGenerator({ ...englishConfig, splitVowels: registration.configuration.splitVowels, followingLetters: registration.configuration.followingLetters });
export const generateWord = generator.generateWord;
export function generateWords(count, options) {
  const rand = options.rand ?? createSeededRng(options.seed);
  return Array.from({ length: count }, () => generateWord({ ...options, rand }));
}
