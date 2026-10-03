import { generateWord as generateConfiguredWord, generateWords as generateConfiguredWords } from "./generator.js";
import type { WordGenerationOptions } from "/Users/ryanbetts/.codex/worktrees/linguistic-q20-style/word-generator/src/types.js";

export const generateWord = (options: WordGenerationOptions = {}) => generateConfiguredWord({ ...options, mode: "text" });
export const generateWords = (count: number, options: WordGenerationOptions = {}) => generateConfiguredWords(count, { ...options, mode: "text" });
