import { generateWord as baseWord, generateWords as baseWords } from "./generator.js";
import type { WordGenerationOptions } from "/Users/ryanbetts/.codex/worktrees/linguistic-q19-frequency/word-generator/src/types.ts";
export const generateWord = (options: WordGenerationOptions = {}) => baseWord({ ...options, mode: "text" });
export const generateWords = (count: number, options: WordGenerationOptions = {}) => baseWords(count, { ...options, mode: "text" });
