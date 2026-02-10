#!/usr/bin/env tsx

/**
 * Compare generated word n-gram distributions against Norvig data.
 *
 * Generates 100k words, counts bigram/trigram frequencies at
 * initial/medial/final positions, and compares against Norvig.
 *
 * Usage: npx tsx scripts/compare-ngrams.ts
 */

import fs from "fs";
import path from "path";
import { generateWord } from "../src/core/generate.js";

const DATA_DIR = path.join(import.meta.dirname, "..", "data", "norvig");
const WORD_COUNT = 100_000;

// --- Load Norvig TSV ---
function loadTsv(file: string): Map<string, Map<string, number>> {
  const text = fs.readFileSync(path.join(DATA_DIR, file), "utf-8");
  const lines = text.trim().split("\n");
  const headers = lines[0].split("\t");
  const result = new Map<string, Map<string, number>>();
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split("\t");
    const cols = new Map<string, number>();
    for (let j = 1; j < headers.length; j++) {
      cols.set(headers[j], parseInt(parts[j], 10) || 0);
    }
    result.set(parts[0], cols);
  }
  return result;
}

// --- Extract n-grams from a word ---
type Position = "initial" | "medial" | "final";

function extractNgrams(word: string, n: number): { ngram: string; position: Position }[] {
  const w = word.toUpperCase();
  if (w.length < n) return [];
  const results: { ngram: string; position: Position }[] = [];
  for (let i = 0; i <= w.length - n; i++) {
    const ng = w.slice(i, i + n);
    let position: Position;
    if (i === 0) position = "initial";
    else if (i === w.length - n) position = "final";
    else position = "medial";
    results.push({ ngram: ng, position });
  }
  return results;
}

// --- Generate words ---
console.log(`Generating ${WORD_COUNT.toLocaleString()} words...`);
const words: string[] = [];
for (let i = 0; i < WORD_COUNT; i++) {
  words.push(generateWord().written.clean);
}
console.log(`Done. Average length: ${(words.reduce((s, w) => s + w.length, 0) / words.length).toFixed(1)}\n`);

// --- Count generated n-gram frequencies ---
type FreqMap = Map<string, number>;

function countFreqs(n: number): { initial: FreqMap; medial: FreqMap; final: FreqMap; all: FreqMap } {
  const initial: FreqMap = new Map();
  const medial: FreqMap = new Map();
  const final: FreqMap = new Map();
  const all: FreqMap = new Map();

  for (const w of words) {
    for (const { ngram, position } of extractNgrams(w, n)) {
      all.set(ngram, (all.get(ngram) || 0) + 1);
      if (position === "initial") initial.set(ngram, (initial.get(ngram) || 0) + 1);
      else if (position === "medial") medial.set(ngram, (medial.get(ngram) || 0) + 1);
      else final.set(ngram, (final.get(ngram) || 0) + 1);
    }
  }
  return { initial, medial, final, all };
}

// --- Normalize to frequency distribution ---
function normalize(m: FreqMap): Map<string, number> {
  const total = [...m.values()].reduce((a, b) => a + b, 0);
  if (total === 0) return m;
  const result = new Map<string, number>();
  for (const [k, v] of m) result.set(k, v / total);
  return result;
}

// --- Get Norvig frequencies for a position ---
function norvigFreqs(data: Map<string, Map<string, number>>, col: string): Map<string, number> {
  const m = new Map<string, number>();
  for (const [ngram, cols] of data) {
    const v = cols.get(col) || 0;
    if (v > 0) m.set(ngram, v);
  }
  return m;
}

// --- Pearson correlation ---
function pearson(a: Map<string, number>, b: Map<string, number>): number {
  const keys = new Set([...a.keys(), ...b.keys()]);
  const xs: number[] = [];
  const ys: number[] = [];
  for (const k of keys) {
    xs.push(a.get(k) || 0);
    ys.push(b.get(k) || 0);
  }
  const n = xs.length;
  const meanX = xs.reduce((s, v) => s + v, 0) / n;
  const meanY = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : num / den;
}

// --- Compare and report ---
function compare(n: number, posLabel: string, genFreqs: FreqMap, norvigCol: string, norvigData: Map<string, Map<string, number>>) {
  const genNorm = normalize(genFreqs);
  const norNorm = normalize(norvigFreqs(norvigData, norvigCol));

  // Compute ratio: generated / norvig (relative representation)
  const allKeys = new Set([...genNorm.keys(), ...norNorm.keys()]);
  const diffs: { ngram: string; genPct: number; norPct: number; ratio: number }[] = [];
  for (const k of allKeys) {
    const g = genNorm.get(k) || 0;
    const nv = norNorm.get(k) || 0;
    if (g === 0 && nv === 0) continue;
    const ratio = nv > 0 ? g / nv : g > 0 ? Infinity : 0;
    diffs.push({ ngram: k, genPct: g * 100, norPct: nv * 100, ratio });
  }

  const r = pearson(genNorm, norNorm);

  console.log(`## ${n}-gram ${posLabel} (Pearson r = ${r.toFixed(4)})\n`);

  // Over-represented
  const over = diffs.filter(d => d.ratio !== Infinity).sort((a, b) => b.ratio - a.ratio).slice(0, 20);
  console.log(`### Over-represented\n`);
  console.log("| N-gram | Generated % | Norvig % | Ratio |");
  console.log("|--------|-------------|----------|-------|");
  for (const d of over) {
    console.log(`| ${d.ngram.padEnd(6)} | ${d.genPct.toFixed(3).padStart(11)} | ${d.norPct.toFixed(3).padStart(8)} | ${d.ratio.toFixed(2).padStart(5)}x |`);
  }

  // Under-represented
  const under = diffs.filter(d => d.ratio > 0 && d.ratio !== Infinity && d.norPct > 0.01).sort((a, b) => a.ratio - b.ratio).slice(0, 20);
  console.log(`\n### Under-represented\n`);
  console.log("| N-gram | Generated % | Norvig % | Ratio |");
  console.log("|--------|-------------|----------|-------|");
  for (const d of under) {
    console.log(`| ${d.ngram.padEnd(6)} | ${d.genPct.toFixed(3).padStart(11)} | ${d.norPct.toFixed(3).padStart(8)} | ${d.ratio.toFixed(2).padStart(5)}x |`);
  }
  console.log("");
}

// --- Main ---
const bigrams = loadTsv("ngrams2.tsv");
const trigrams = loadTsv("ngrams3.tsv");

const biFreqs = countFreqs(2);
const triFreqs = countFreqs(3);

compare(2, "Initial (*/1:2)", biFreqs.initial, "*/1:2", bigrams);
compare(2, "Final (*/-2:-1)", biFreqs.final, "*/-2:-1", bigrams);
compare(2, "All (*/*)", biFreqs.all, "*/*", bigrams);
compare(3, "Initial (*/1:3)", triFreqs.initial, "*/1:3", trigrams);
compare(3, "Final (*/-3:-1)", triFreqs.final, "*/-3:-1", trigrams);
compare(3, "All (*/*)", triFreqs.all, "*/*", trigrams);
