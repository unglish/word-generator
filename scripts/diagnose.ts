#!/usr/bin/env tsx
/**
 * Reusable diagnostic script for analyzing letter patterns in generated words.
 *
 * Usage: npx tsx scripts/diagnose.ts <pattern> [--sample <size>] [--trace <percent>] [--seed <n>]
 */

import { generateWords } from '../dist/core/generate.js';
import type { Word, Syllable } from '../dist/types.js';
import type { WordTrace, SyllableSnapshot } from '../dist/core/trace.js';
import * as fs from 'fs';
import * as path from 'path';

// ─── CLI Parsing ─────────────────────────────────────────────────────────────

function parseArgs(): { pattern: string; sampleSize: number; tracePercent: number; seed?: number } {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0].startsWith('-')) {
    console.error('Usage: npx tsx scripts/diagnose.ts <pattern> [--sample <size>] [--trace <percent>] [--seed <n>]');
    process.exit(1);
  }

  const pattern = args[0].toLowerCase();
  let sampleSize = 50000;
  let tracePercent = 10;
  let seed: number | undefined;

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if ((arg === '--sample' || arg === '-s') && args[i + 1]) {
      sampleSize = parseInt(args[++i], 10);
    } else if ((arg === '--trace' || arg === '-t') && args[i + 1]) {
      tracePercent = parseFloat(args[++i]);
    } else if (arg === '--seed' && args[i + 1]) {
      seed = parseInt(args[++i], 10);
    }
  }

  return { pattern, sampleSize, tracePercent, seed };
}

// ─── CMU Lexicon Check ──────────────────────────────────────────────────────

interface CmuResult {
  frequency: number;     // as fraction of total
  rank: number;
  totalNgrams: number;
  count: number;
  verdict: string;
  examples: string[];    // We can't get examples from the freq files alone
}

function checkCmu(pattern: string): CmuResult {
  const len = pattern.length;
  let jsonFile: string;
  if (len === 1) {
    jsonFile = 'memory/cmu-lexicon-letters.json';
  } else if (len === 2) {
    jsonFile = 'memory/cmu-lexicon-bigrams.json';
  } else if (len === 3) {
    jsonFile = 'memory/cmu-lexicon-trigrams.json';
  } else {
    // For longer patterns, try trigrams as fallback
    jsonFile = 'memory/cmu-lexicon-trigrams.json';
  }

  const filePath = path.resolve(process.cwd(), jsonFile);
  if (!fs.existsSync(filePath)) {
    return { frequency: 0, rank: -1, totalNgrams: 0, count: 0, verdict: 'LEXICON FILE NOT FOUND', examples: [] };
  }

  const data: Record<string, number> = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const totalCount = entries.reduce((sum, [, v]) => sum + v, 0);

  const count = data[pattern] ?? 0;
  const frequency = count / totalCount;
  const rank = count > 0 ? entries.findIndex(([k]) => k === pattern) + 1 : -1;

  let verdict: string;
  if (count === 0) {
    verdict = 'NOT FOUND in English lexicon';
  } else if (frequency < 0.0001) {
    verdict = 'EXTREMELY RARE';
  } else if (frequency < 0.001) {
    verdict = 'RARE but EXISTS';
  } else if (frequency < 0.01) {
    verdict = 'UNCOMMON';
  } else {
    verdict = 'COMMON';
  }

  return { frequency, rank, totalNgrams: entries.length, count, verdict, examples: [] };
}

// ─── Pattern Position Detection ─────────────────────────────────────────────

type Position = 'word-initial' | 'word-medial' | 'word-final';
type Boundary = 'within-syllable' | 'cross-syllable' | 'unknown';

interface TraceInstance {
  word: string;
  pronunciation: string;
  position: Position;
  boundary: Boundary;
  syllableStructures: string[];
  containingSyllableIndex: number;
  category: string;
  categoryDetail: string;
  syllableSnapshots?: SyllableSnapshot[];
}

function getPosition(word: string, pattern: string): Position {
  const idx = word.indexOf(pattern);
  if (idx === 0) return 'word-initial';
  if (idx + pattern.length === word.length) return 'word-final';
  return 'word-medial';
}

function formatSyllable(s: Syllable): string {
  const onset = s.onset.map(p => p.sound).join('');
  const nucleus = s.nucleus.map(p => p.sound).join('');
  const coda = s.coda.map(p => p.sound).join('');
  return `${onset}.${nucleus}.${coda}`;
}

function formatSyllableSnapshot(s: SyllableSnapshot): string {
  return `${s.onset.join('')}.${s.nucleus.join('')}.${s.coda.join('')}`;
}

/**
 * Determine if the pattern spans a syllable boundary by checking grapheme-to-syllable mapping.
 */
function detectBoundary(word: Word, pattern: string): { boundary: Boundary; syllableIndex: number } {
  // Build a rough letter-to-syllable map from grapheme trace
  if (!word.trace?.graphemeSelections?.length) {
    return { boundary: 'unknown', syllableIndex: -1 };
  }

  // Build string from grapheme selections with syllable indices
  const charSyllable: number[] = [];
  for (const gs of word.trace.graphemeSelections) {
    for (let i = 0; i < gs.selected.length; i++) {
      charSyllable.push(gs.syllableIndex);
    }
  }

  const cleanWord = word.written.clean;
  const idx = cleanWord.indexOf(pattern);
  if (idx < 0 || idx + pattern.length > charSyllable.length) {
    return { boundary: 'unknown', syllableIndex: -1 };
  }

  const syllablesInPattern = new Set<number>();
  for (let i = idx; i < idx + pattern.length; i++) {
    syllablesInPattern.add(charSyllable[i]);
  }

  if (syllablesInPattern.size === 1) {
    return { boundary: 'within-syllable', syllableIndex: [...syllablesInPattern][0] };
  } else {
    return { boundary: 'cross-syllable', syllableIndex: Math.min(...syllablesInPattern) };
  }
}

// ─── Categorization ─────────────────────────────────────────────────────────

function categorize(instance: TraceInstance, word: Word, pattern: string): { category: string; detail: string } {
  if (instance.boundary === 'cross-syllable') {
    // Identify which phonemes are at the boundary
    const syllables = word.syllables;
    const si = instance.containingSyllableIndex;
    if (si >= 0 && si < syllables.length - 1) {
      const coda = syllables[si].coda.map(p => p.sound).join('');
      const nextOnset = syllables[si + 1].onset.map(p => p.sound).join('');
      return {
        category: 'Cross-syllable boundary',
        detail: `/${coda}/ coda + /${nextOnset}/ onset`,
      };
    }
    return { category: 'Cross-syllable boundary', detail: 'boundary phonemes unclear' };
  }

  if (instance.boundary === 'within-syllable') {
    const si = instance.containingSyllableIndex;
    if (si >= 0 && si < word.syllables.length) {
      const syl = word.syllables[si];
      const codaSounds = syl.coda.map(p => p.sound).join('');
      const onsetSounds = syl.onset.map(p => p.sound).join('');

      // Check if pattern letters correspond to coda cluster
      if (instance.position === 'word-final' && codaSounds.length > 1) {
        return { category: 'Coda cluster', detail: `/${codaSounds}/ cluster` };
      }
      if (instance.position === 'word-initial' && onsetSounds.length > 1) {
        return { category: 'Onset cluster', detail: `/${onsetSounds}/ cluster` };
      }

      // Check for morphological trace
      if (word.trace?.morphology) {
        return { category: 'Morphological', detail: `template: ${word.trace.morphology.template}` };
      }

      return { category: 'Grapheme/spelling artifact', detail: 'within single syllable' };
    }
  }

  // Morphological check
  if (word.trace?.morphology) {
    return { category: 'Morphological', detail: `template: ${word.trace.morphology.template}` };
  }

  return { category: 'Other', detail: 'unable to determine' };
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
  const { pattern, sampleSize, tracePercent, seed } = parseArgs();

  // ═══ Step 1: CMU check ═══
  const cmu = checkCmu(pattern);

  // ═══ Step 2: Generate sample ═══
  console.log(`Generating ${sampleSize.toLocaleString()} words...`);
  const genOptions: any = { morphology: true, trace: false };
  if (seed !== undefined) genOptions.seed = seed;

  const allWords = generateWords(sampleSize, genOptions);
  const matches: Word[] = [];
  for (const w of allWords) {
    if (w.written.clean.includes(pattern)) {
      matches.push(w);
    }
  }

  const matchPercent = matches.length / sampleSize;

  // ═══ Step 3: Trace instances ═══
  const traceCount = Math.max(1, Math.ceil(matches.length * (tracePercent / 100)));
  console.log(`Tracing ${traceCount} of ${matches.length} matches...`);

  // Re-generate traced words. We'll generate a new batch with trace=true,
  // collecting until we have enough matches.
  const tracedInstances: TraceInstance[] = [];
  const tracedWords: Word[] = [];

  // Generate with trace enabled, collecting matches
  let generated = 0;
  const batchSize = 1000;
  let traceSeed = seed !== undefined ? seed + 1000000 : undefined;

  while (tracedInstances.length < traceCount && generated < sampleSize * 3) {
    const batchOpts: any = { morphology: true, trace: true };
    if (traceSeed !== undefined) batchOpts.seed = traceSeed++;
    // Generate one at a time with unique seeds to get variety
    const batch = generateWords(batchSize, { morphology: true, trace: true, seed: traceSeed });
    if (traceSeed !== undefined) traceSeed += batchSize;
    generated += batchSize;

    for (const w of batch) {
      if (tracedInstances.length >= traceCount) break;
      const clean = w.written.clean;
      if (!clean.includes(pattern)) continue;

      const pos = getPosition(clean, pattern);
      const { boundary, syllableIndex } = detectBoundary(w, pattern);

      const inst: TraceInstance = {
        word: clean,
        pronunciation: w.pronunciation,
        position: pos,
        boundary,
        syllableStructures: w.syllables.map(formatSyllable),
        containingSyllableIndex: syllableIndex,
        category: '',
        categoryDetail: '',
        syllableSnapshots: w.trace?.stages?.find(s => s.name === 'initial' || s.name === 'phonemeSelection')?.after,
      };

      const cat = categorize(inst, w, pattern);
      inst.category = cat.category;
      inst.categoryDetail = cat.detail;

      tracedInstances.push(inst);
      tracedWords.push(w);
    }
  }

  // ═══ Step 4: Categorize ═══
  const categories = new Map<string, { count: number; detail: string; examples: string[] }>();
  for (const inst of tracedInstances) {
    const key = inst.category;
    if (!categories.has(key)) {
      categories.set(key, { count: 0, detail: inst.categoryDetail, examples: [] });
    }
    const cat = categories.get(key)!;
    cat.count++;
    if (cat.examples.length < 5) {
      cat.examples.push(`${inst.word} (${inst.pronunciation})`);
    }
  }

  // Sort by count descending
  const sortedCategories = [...categories.entries()].sort((a, b) => b[1].count - a[1].count);

  // ═══ Step 5: Build report ═══
  const overRep = cmu.frequency > 0 ? matchPercent / cmu.frequency : Infinity;

  const lines: string[] = [];
  lines.push('═══════════════════════════════════════════');
  lines.push(`  Diagnostic: "${pattern}"`);
  lines.push('═══════════════════════════════════════════');
  lines.push('');
  lines.push('CMU Lexicon Check');
  lines.push('─────────────────');
  if (cmu.count > 0) {
    lines.push(`  Frequency: ${(cmu.frequency * 100).toFixed(4)}% (rank #${cmu.rank} of ${cmu.totalNgrams})`);
    lines.push(`  Occurrences: ${cmu.count.toLocaleString()} words`);
  } else {
    lines.push(`  Frequency: 0%`);
  }
  lines.push(`  Verdict: ${cmu.verdict}`);
  lines.push('');
  lines.push(`Sample Analysis (${sampleSize.toLocaleString()} words)`);
  lines.push('──────────────────────────────');
  lines.push(`  Matches: ${matches.length} (${(matchPercent * 100).toFixed(3)}%)`);
  lines.push(`  CMU baseline: ${(cmu.frequency * 100).toFixed(4)}%`);
  if (cmu.frequency > 0) {
    lines.push(`  Over-representation: ${overRep.toFixed(1)}×`);
  } else {
    lines.push(`  Over-representation: ∞ (not in CMU)`);
  }
  lines.push('');
  lines.push(`Root Cause Breakdown (${tracedInstances.length} traced)`);
  lines.push('────────────────────');

  for (const [category, data] of sortedCategories) {
    const pct = ((data.count / tracedInstances.length) * 100).toFixed(0);
    lines.push(`  ${pct.padStart(3)}% — ${category}: ${data.detail}`);
    for (const ex of data.examples) {
      lines.push(`         • ${ex}`);
    }
    lines.push('');
  }

  // Position breakdown
  const positions = { 'word-initial': 0, 'word-medial': 0, 'word-final': 0 };
  const boundaries = { 'within-syllable': 0, 'cross-syllable': 0, 'unknown': 0 };
  for (const inst of tracedInstances) {
    positions[inst.position]++;
    boundaries[inst.boundary]++;
  }

  lines.push('Position Distribution');
  lines.push('─────────────────────');
  for (const [pos, count] of Object.entries(positions)) {
    const pct = tracedInstances.length > 0 ? ((count / tracedInstances.length) * 100).toFixed(0) : '0';
    lines.push(`  ${pct.padStart(3)}% — ${pos} (${count})`);
  }
  lines.push('');

  lines.push('Boundary Distribution');
  lines.push('─────────────────────');
  for (const [bnd, count] of Object.entries(boundaries)) {
    const pct = tracedInstances.length > 0 ? ((count / tracedInstances.length) * 100).toFixed(0) : '0';
    lines.push(`  ${pct.padStart(3)}% — ${bnd} (${count})`);
  }
  lines.push('');

  // Detailed traces (first 20)
  lines.push('Detailed Traces (first 20)');
  lines.push('──────────────────────────');
  for (const inst of tracedInstances.slice(0, 20)) {
    lines.push(`  ${inst.word}`);
    lines.push(`    IPA: ${inst.pronunciation}`);
    lines.push(`    Syllables: ${inst.syllableStructures.join(' | ')}`);
    lines.push(`    Position: ${inst.position}, Boundary: ${inst.boundary}`);
    lines.push(`    Category: ${inst.category} — ${inst.categoryDetail}`);
    lines.push('');
  }

  // Recommendation
  lines.push('Recommendation');
  lines.push('──────────────');
  if (sortedCategories.length > 0) {
    const [topCat, topData] = sortedCategories[0];
    const topPct = ((topData.count / tracedInstances.length) * 100).toFixed(0);
    lines.push(`  Primary cause: ${topCat} (${topPct}%) — ${topData.detail}`);

    if (parseInt(topPct) > 70) {
      lines.push(`  Suggested fix level: Targeted fix for ${topCat.toLowerCase()}`);
    } else {
      lines.push(`  Suggested fix level: Multiple causes — may need layered approach`);
    }
  }

  if (matches.length === 0 && cmu.count === 0) {
    lines.push(`  Severity: NONE — pattern not found in sample or CMU`);
  } else if (overRep > 10) {
    lines.push(`  Severity: HIGH (${overRep.toFixed(0)}× over-represented)`);
  } else if (overRep > 3) {
    lines.push(`  Severity: MODERATE (${overRep.toFixed(1)}× over-represented)`);
  } else if (overRep > 1.5) {
    lines.push(`  Severity: LOW (${overRep.toFixed(1)}× over-represented)`);
  } else {
    lines.push(`  Severity: NONE — within expected range`);
  }

  const report = lines.join('\n');

  // Print to stdout
  console.log('\n' + report);

  // Save files
  const memDir = path.resolve(process.cwd(), 'memory');
  if (!fs.existsSync(memDir)) fs.mkdirSync(memDir, { recursive: true });

  const reportPath = path.join(memDir, `${pattern}-diagnostic.md`);
  fs.writeFileSync(reportPath, report);
  console.log(`\nReport saved to ${reportPath}`);

  const instancesPath = path.join(memDir, `${pattern}-instances.json`);
  fs.writeFileSync(instancesPath, JSON.stringify(tracedInstances, null, 2));
  console.log(`Trace data saved to ${instancesPath}`);
}

main();
