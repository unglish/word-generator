#!/usr/bin/env tsx

/**
 * Generate English baseline phonotactic scores using the TypeScript scorer.
 * 
 * Scores ALL CMU dictionary words (~135k) to establish a comprehensive
 * baseline for comparison with generated words.
 */

import fs from 'fs';
import path from 'path';

// We need to manually fetch the CMU dict since we don't have a package for it
interface BaselineData {
  description: string;
  validatedAt: string;
  sampleSize: number;
  seeds: number[];
  scores: {
    mean: number;
    median: number;
    min: number;
    max: number;
    meanPerBigram: number;
    medianPerBigram: number;
    minPerBigram: number;
    maxPerBigram: number;
  };
  varianceAcrossSeeds: {
    note: string;
    meanRange: [number, number];
    minRange: [number, number];
    maxRange: [number, number];
  };
  generatedBaseline: {
    note: string;
    gap: number;
    generatedMean: number;
    measuredAt: string;
  };
}

/**
 * Clean ARPABET phoneme by removing stress digits
 */
function cleanPhoneme(phoneme: string): string {
  return phoneme.replace(/[0-9]/g, '');
}

/**
 * Download and parse CMU dictionary to extract word-pronunciation pairs
 */
async function getCMUWords(): Promise<{ word: string; arpabet: string }[]> {
  const cmuUrl = 'http://svn.code.sf.net/p/cmusphinx/code/trunk/cmudict/cmudict-0.7b';
  
  console.log('🔄 Downloading CMU dictionary for baseline generation...');
  
  const response = await fetch(cmuUrl);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const text = await response.text();
  const lines = text.split('\n');
  const words: { word: string; arpabet: string }[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip comments and empty lines
    if (trimmed.startsWith(';;;') || trimmed === '') {
      continue;
    }
    
    // Parse dictionary entry: WORD  P H O N E M E S
    const match = trimmed.match(/^([A-Z']+)(\([0-9]+\))?\s+(.+)$/);
    if (!match) {
      continue;
    }
    
    const [, word, variant, phonemes] = match;
    
    // Skip variants (keep only the primary pronunciation)
    if (variant) {
      continue;
    }
    
    // Clean phonemes: remove stress digits
    const cleanedPhonemes = phonemes
      .split(/\s+/)
      .map(cleanPhoneme)
      .filter(p => p.length > 0);
    
    if (cleanedPhonemes.length > 0) {
      words.push({
        word: word.toLowerCase(),
        arpabet: cleanedPhonemes.join(' ')
      });
    }
  }
  
  console.log(`📖 Extracted ${words.length} words from CMU dictionary`);
  return words;
}

// Removed seeded random - not needed for full dictionary baseline

// Removed shuffle function - not needed for full dictionary baseline

// Removed scoreWords - using scorer module directly in main

/**
 * Calculate statistics from an array of scores
 */
function calculateStats(scores: number[]) {
  const validScores = scores.filter(s => !isNaN(s) && isFinite(s));
  validScores.sort((a, b) => a - b);
  
  const mean = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
  const median = validScores[Math.floor(validScores.length / 2)];
  const min = validScores[0];
  const max = validScores[validScores.length - 1];
  
  return { mean, median, min, max };
}

/**
 * Calculate per-bigram statistics
 */
function calculatePerBigramStats(scoredWords: Array<{score: number; perBigram: number}>) {
  const perBigramScores = scoredWords.map(w => w.perBigram).filter(s => !isNaN(s) && isFinite(s));
  perBigramScores.sort((a, b) => a - b);
  
  const meanPerBigram = perBigramScores.reduce((sum, score) => sum + score, 0) / perBigramScores.length;
  const medianPerBigram = perBigramScores[Math.floor(perBigramScores.length / 2)];
  const minPerBigram = perBigramScores[0];
  const maxPerBigram = perBigramScores[perBigramScores.length - 1];
  
  return { meanPerBigram, medianPerBigram, minPerBigram, maxPerBigram };
}

/**
 * Main execution
 */
async function main() {
  console.log('🎯 Generating English baseline with full CMU dictionary (~135k words)...\n');
  
  // Get ALL CMU dictionary words
  const cmuWords = await getCMUWords();
  console.log(`📖 Processing ${cmuWords.length} words from CMU dictionary...`);
  
  // Score all words using the scorer module
  const scorerModule = await import('../src/phonotactic/score.js');
  const arpabetWords = cmuWords.map(w => w.arpabet);
  const scoredWords = scorerModule.scoreArpabetWords(arpabetWords);
  
  // Filter out invalid scores and calculate total score statistics
  const validScored = scoredWords.filter(s => !isNaN(s.score) && isFinite(s.score) && !isNaN(s.perBigram) && isFinite(s.perBigram));
  const totalScores = validScored.map(s => s.score);
  totalScores.sort((a, b) => a - b);
  
  const totalStats = calculateStats(totalScores);
  const perBigramStats = calculatePerBigramStats(validScored);
  
  // Create baseline data with known per-bigram stats
  const baseline: BaselineData = {
    description: `English phonotactic baseline from full CMU dictionary (${validScored.length} words). Generated with TypeScript scorer.`,
    validatedAt: new Date().toISOString().split('T')[0],
    sampleSize: validScored.length,
    seeds: [], // Not applicable for full dictionary
    scores: {
      mean: parseFloat(totalStats.mean.toFixed(2)),
      median: parseFloat(totalStats.median.toFixed(2)),
      min: parseFloat(totalStats.min.toFixed(2)),
      max: parseFloat(totalStats.max.toFixed(2)),
      meanPerBigram: parseFloat(perBigramStats.meanPerBigram.toFixed(2)),
      medianPerBigram: parseFloat(perBigramStats.medianPerBigram.toFixed(2)),
      minPerBigram: parseFloat(perBigramStats.minPerBigram.toFixed(2)),
      maxPerBigram: parseFloat(perBigramStats.maxPerBigram.toFixed(2))
    },
    varianceAcrossSeeds: {
      note: "Full dictionary baseline - no sampling variance.",
      meanRange: [totalStats.mean, totalStats.mean],
      minRange: [totalStats.min, totalStats.min],
      maxRange: [totalStats.max, totalStats.max]
    },
    generatedBaseline: {
      note: "Will be updated after measuring current generated word performance with per-bigram scoring.",
      gap: 0,
      generatedMean: 0,
      measuredAt: new Date().toISOString().split('T')[0]
    }
  };
  
  // Write baseline file
  const outputPath = path.join(process.cwd(), 'src/phonotactic/english-baseline.json');
  fs.writeFileSync(outputPath, JSON.stringify(baseline, null, 2) + '\n', 'utf8');
  
  console.log(`\n✅ Generated ${outputPath}`);
  console.log(`📊 English baseline stats (${validScored.length} words):`);
  console.log(`   Total scores:`);
  console.log(`     Mean: ${baseline.scores.mean}`);
  console.log(`     Median: ${baseline.scores.median}`);
  console.log(`     Min: ${baseline.scores.min}`);
  console.log(`     Max: ${baseline.scores.max}`);
  console.log(`   Per-bigram scores:`);
  console.log(`     Mean: ${baseline.scores.meanPerBigram}`);
  console.log(`     Median: ${baseline.scores.medianPerBigram}`);
  console.log(`     Min: ${baseline.scores.minPerBigram}`);
  console.log(`     Max: ${baseline.scores.maxPerBigram}`);
  console.log(`\nNext steps:`);
  console.log(`  1. Update tests to use per-bigram scoring: src/phonotactic/phonotactic.test.ts`);
  console.log(`  2. Update docs with new per-bigram calibration: docs/phonotactic-scoring.md`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
