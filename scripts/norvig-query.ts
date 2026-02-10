#!/usr/bin/env tsx

/**
 * Query Norvig n-gram TSV files.
 *
 * Usage:
 *   npx tsx scripts/norvig-query.ts --ngram TH --position initial
 *   npx tsx scripts/norvig-query.ts --ngram ING --position final
 *   npx tsx scripts/norvig-query.ts --top 20 --position initial --length 2
 *   npx tsx scripts/norvig-query.ts --ngram E --by-position
 *   npx tsx scripts/norvig-query.ts --top 20 --position final --length 3 --word-length 5
 */

import fs from "fs";
import path from "path";

const DATA_DIR = path.join(import.meta.dirname, "..", "data", "norvig");

// --- CLI arg parsing ---
function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= process.argv.length) return undefined;
  return process.argv[idx + 1];
}
function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

const ngram = getArg("ngram")?.toUpperCase();
const position = getArg("position") as "initial" | "final" | "all" | undefined;
const top = parseInt(getArg("top") || "0", 10);
const length = parseInt(getArg("length") || "0", 10);
const wordLength = parseInt(getArg("word-length") || "0", 10);
const byPosition = hasFlag("by-position");

if (!ngram && !top) {
  console.error("Provide --ngram <NGRAM> or --top <N>");
  process.exit(1);
}

// --- Load TSV ---
interface NgramRow {
  ngram: string;
  columns: Map<string, number>;
}

function loadTsv(file: string): { headers: string[]; rows: NgramRow[] } {
  const text = fs.readFileSync(path.join(DATA_DIR, file), "utf-8");
  const lines = text.trim().split("\n");
  const headers = lines[0].split("\t");
  const rows: NgramRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split("\t");
    const columns = new Map<string, number>();
    for (let j = 1; j < headers.length; j++) {
      columns.set(headers[j], parseInt(parts[j], 10) || 0);
    }
    rows.push({ ngram: parts[0], columns });
  }
  return { headers, rows };
}

function detectLength(): number {
  if (length) return length;
  if (ngram) return ngram.length;
  return 2; // default bigrams
}

const ngramLen = detectLength();
const file = `ngrams${ngramLen}.tsv`;
if (!fs.existsSync(path.join(DATA_DIR, file))) {
  console.error(`No data file for ${ngramLen}-grams: ${file}`);
  process.exit(1);
}

const { headers, rows } = loadTsv(file);

// --- Column selection helpers ---
function getColumnForPosition(pos: string, wLen: number, n: number): string | undefined {
  if (pos === "initial") {
    if (wLen > 0) return `${wLen}/1:${n}`;
    return `*/1:${n}`;
  }
  if (pos === "final") {
    if (wLen > 0) return `${wLen}/${wLen - n + 1}:${wLen}`;
    return `*/-${n}:-1`;
  }
  if (pos === "all") {
    if (wLen > 0) return `${wLen}/*`;
    return `*/*`;
  }
  return `*/*`;
}

function getValue(row: NgramRow, col: string): number {
  return row.columns.get(col) || 0;
}

// --- Mode: by-position ---
if (ngram && byPosition) {
  const row = rows.find((r) => r.ngram === ngram);
  if (!row) {
    console.error(`N-gram "${ngram}" not found.`);
    process.exit(1);
  }
  console.log(`\nPositional breakdown for "${ngram}" (${ngramLen}-gram):\n`);
  console.log("| Column | Count |");
  console.log("|--------|-------|");
  for (const h of headers.slice(1)) {
    const v = getValue(row, h);
    if (v > 0) {
      console.log(`| ${h.padEnd(12)} | ${v.toLocaleString().padStart(18)} |`);
    }
  }
  process.exit(0);
}

// --- Mode: specific ngram lookup ---
if (ngram && !top) {
  const row = rows.find((r) => r.ngram === ngram);
  if (!row) {
    console.error(`N-gram "${ngram}" not found.`);
    process.exit(1);
  }
  const col = getColumnForPosition(position || "all", wordLength, ngramLen);
  if (!col || !row.columns.has(col)) {
    console.error(`Column "${col}" not found. Available: ${headers.slice(1).join(", ")}`);
    process.exit(1);
  }
  const val = getValue(row, col);
  console.log(`${ngram} [${col}]: ${val.toLocaleString()}`);
  process.exit(0);
}

// --- Mode: top N ---
if (top) {
  const col = getColumnForPosition(position || "all", wordLength, ngramLen);
  if (!col || !headers.includes(col)) {
    console.error(`Column "${col}" not found. Available: ${headers.slice(1).join(", ")}`);
    process.exit(1);
  }

  const sorted = [...rows].sort((a, b) => getValue(b, col) - getValue(a, col)).slice(0, top);
  const total = rows.reduce((s, r) => s + getValue(r, col), 0);

  console.log(`\nTop ${top} ${ngramLen}-grams by ${col}:\n`);
  console.log("| Rank | N-gram | Count | % |");
  console.log("|------|--------|-------|---|");
  sorted.forEach((r, i) => {
    const v = getValue(r, col);
    const pct = ((v / total) * 100).toFixed(2);
    console.log(`| ${String(i + 1).padStart(4)} | ${r.ngram.padEnd(6)} | ${v.toLocaleString().padStart(18)} | ${pct.padStart(6)}% |`);
  });
}
