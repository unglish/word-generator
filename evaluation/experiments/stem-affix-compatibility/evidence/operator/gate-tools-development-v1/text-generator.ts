import { generateWord as generateConfiguredWord, generateWords as generateConfiguredWords } from "./generator.js";
import type { WordGenerationOptions } from "/Users/ryanbetts/.codex/worktrees/linguistic-q18-categories/word-generator/src/types.ts";

export const generateWord = (options: WordGenerationOptions = {}) => generateConfiguredWord({ ...options, mode: "text" });
export const generateWords = (count: number, options: WordGenerationOptions = {}) => generateConfiguredWords(count, { ...options, mode: "text" });
