#!/usr/bin/env tsx

/**
 * Check how many common English words the generator can produce.
 *
 * Usage:
 *   npx tsx scripts/coverage-check.ts
 *   npx tsx scripts/coverage-check.ts --top 500 --count 1000000
 */

import fs from "fs";
import path from "path";
import { generateWord } from "../src/core/generate.js";

// --- CLI args ---
function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= process.argv.length) return undefined;
  return process.argv[idx + 1];
}

const TOP_N = parseInt(getArg("top") || "1000", 10);
const GEN_COUNT = parseInt(getArg("count") || "500000", 10);

// --- Load common words ---
const commonWordsFile = path.join(import.meta.dirname, "..", "data", "norvig", "google-books-common-words.txt");
if (!fs.existsSync(commonWordsFile)) {
  console.error(`Common words file not found: ${commonWordsFile}`);
  console.error("Expected data/norvig/google-books-common-words.txt");
  process.exit(1);
}

const allCommonWords = fs.readFileSync(commonWordsFile, "utf-8")
  .trim()
  .split("\n")
  .map((line) => line.trim().split(/\s+/)[0].toLowerCase())
  .filter((w) => w.length > 0);

const targetWords = new Set(allCommonWords.slice(0, TOP_N));

console.log(`Loaded ${allCommonWords.length} common words, using top ${TOP_N}`);
console.log(`Generating ${GEN_COUNT.toLocaleString()} words...\n`);

// --- Generate and check ---
const generated = new Set<string>();
for (let i = 0; i < GEN_COUNT; i++) {
  generated.add(generateWord().written.clean.toLowerCase());
}

const hits = new Set<string>();
const misses = new Set<string>();
for (const w of targetWords) {
  if (generated.has(w)) hits.add(w);
  else misses.add(w);
}

const coverage = (hits.size / targetWords.size) * 100;
console.log(`## Coverage Results\n`);
console.log(`- Target words: ${targetWords.size}`);
console.log(`- Unique words generated: ${generated.size.toLocaleString()}`);
console.log(`- Matches: ${hits.size}`);
console.log(`- Missing: ${misses.size}`);
console.log(`- **Coverage: ${coverage.toFixed(2)}%**\n`);

// --- Cluster missing words ---
function classify(word: string): string[] {
  const tags: string[] = [];
  if (word.length <= 3) tags.push("short (≤3 letters)");
  if (/[^aeiou]e$/.test(word) && word.length >= 4) tags.push("silent-e");
  if (/ght/.test(word)) tags.push("ght trigraph");
  if (/(.)\1/.test(word)) tags.push("double letters");
  if (/[^aeiou]{3,}/.test(word)) tags.push("consonant cluster (3+)");
  if (/tion$|sion$/.test(word)) tags.push("-tion/-sion");
  if (/ous$/.test(word)) tags.push("-ous");
  if (/ight$/.test(word)) tags.push("-ight");
  if (/ph/.test(word)) tags.push("ph digraph");
  if (/ck/.test(word)) tags.push("ck digraph");
  if (/[aeiou]{2}/.test(word)) tags.push("vowel digraph");
  if (/^(kn|wr|gn)/.test(word) || /mb$|mn$/.test(word)) tags.push("silent letter");
  if (/[aeiou]r/.test(word)) tags.push("r-colored vowel");
  if (/^wh/.test(word)) tags.push("wh- onset");
  if (/ly$/.test(word)) tags.push("-ly suffix");
  if (/ing$/.test(word)) tags.push("-ing suffix");
  if (/ed$/.test(word)) tags.push("-ed suffix");
  if (/[aeiou][lr]e$/.test(word)) tags.push("schwa spelling (-le/-re)");
  if (/[aeiou]l$|[aeiou]n$/.test(word)) tags.push("syllabic consonant");
  if (tags.length === 0) tags.push("other");
  return tags;
}

const clusters = new Map<string, string[]>();
for (const w of misses) {
  for (const tag of classify(w)) {
    if (!clusters.has(tag)) clusters.set(tag, []);
    clusters.get(tag)!.push(w);
  }
}

console.log(`## Missing Word Patterns\n`);
console.log("| Pattern | Count | Examples |");
console.log("|---------|-------|----------|");
const sorted = [...clusters.entries()].sort((a, b) => b[1].length - a[1].length);
for (const [pattern, words] of sorted) {
  const examples = words.slice(0, 5).join(", ");
  console.log(`| ${pattern} | ${words.length} | ${examples} |`);
}

if (misses.size > 0 && misses.size <= 100) {
  console.log(`\n## All Missing Words\n`);
  console.log([...misses].sort().join(", "));
}
