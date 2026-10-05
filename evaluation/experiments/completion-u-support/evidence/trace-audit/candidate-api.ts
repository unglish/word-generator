import { createGenerator, englishConfig, createSeededRng } from "/private/tmp/q14a-completion-u-support-v1/src/index.ts";
import { readFileSync } from "node:fs";
const measurement = JSON.parse(readFileSync("/private/tmp/q14a-completion-u-support-evidence-v1/measured-configuration.json", "utf8"));
const generator = createGenerator({ ...englishConfig, splitVowels: measurement });
export const generateWord = generator.generateWord;
export function generateWords(count, options) {
  const rand = options.rand ?? createSeededRng(options.seed);
  return Array.from({length:count}, () => generateWord({ ...options, rand }));
}
