#!/usr/bin/env tsx

/**
 * Generate English baseline phonotactic scores using the TypeScript scorer.
 * 
 * Scores 100 random CMU dictionary words across 5 seeds to establish
 * a baseline for comparison with generated words.
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

/**
 * Simple seeded random number generator
 */
function createSeededRandom(seed: number) {
  let state = seed;
  return function random() {
    state = (state * 1664525 + 1013904223) % 2147483647;
    return state / 2147483647;
  };
}

/**
 * Shuffle array using seeded random
 */
function shuffleArray<T>(array: T[], seed: number): T[] {
  const random = createSeededRandom(seed);
  const shuffled = [...array];
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

/**
 * Score ARPABET words using the imported scorer
 */
async function scoreWords(arpabetWords: string[]): Promise<number[]> {
  // Import the scorer function dynamically 
  const scorerModule = await import('../src/phonotactic/score.js');
  const scored = scorerModule.scoreArpabetWords(arpabetWords);
  return scored.map(s => s.score);
}

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
 * Main execution
 */
async function main() {
  console.log('🎯 Generating English baseline with TypeScript scorer...\n');
  
  // Get CMU dictionary words
  const cmuWords = await getCMUWords();
  
  // Test with multiple seeds for stability
  const seeds = [42, 123, 456, 789, 1337];
  const sampleSize = 100;
  
  const allResults: number[] = [];
  const seedResults: Array<{ seed: number; stats: any }> = [];
  
  for (const seed of seeds) {
    console.log(`🔄 Testing seed ${seed}...`);
    
    // Randomly sample words
    const shuffled = shuffleArray(cmuWords, seed);
    const sample = shuffled.slice(0, sampleSize);
    const arpabetWords = sample.map(w => w.arpabet);
    
    // Score the words
    const scores = await scoreWords(arpabetWords);
    const stats = calculateStats(scores);
    
    seedResults.push({ seed, stats });
    allResults.push(...scores);
    
    console.log(`   Mean: ${stats.mean.toFixed(2)}, Min: ${stats.min.toFixed(2)}, Max: ${stats.max.toFixed(2)}`);
  }
  
  // Calculate overall statistics
  const overallStats = calculateStats(allResults);
  
  // Calculate variance across seeds
  const seedMeans = seedResults.map(r => r.stats.mean);
  const seedMins = seedResults.map(r => r.stats.min);
  const seedMaxs = seedResults.map(r => r.stats.max);
  
  const meanRange: [number, number] = [Math.min(...seedMeans), Math.max(...seedMeans)];
  const minRange: [number, number] = [Math.min(...seedMins), Math.max(...seedMins)];
  const maxRange: [number, number] = [Math.min(...seedMaxs), Math.max(...seedMaxs)];
  
  // Create baseline data (set gap to 0 initially)
  const baseline: BaselineData = {
    description: `English phonotactic baseline from ${sampleSize} random CMU dict words across ${seeds.length} seeds. Generated with TypeScript scorer.`,
    validatedAt: new Date().toISOString().split('T')[0],
    sampleSize,
    seeds,
    scores: {
      mean: parseFloat(overallStats.mean.toFixed(2)),
      median: parseFloat(overallStats.median.toFixed(2)),
      min: parseFloat(overallStats.min.toFixed(2)),
      max: parseFloat(overallStats.max.toFixed(2))
    },
    varianceAcrossSeeds: {
      note: `Tested ${seeds.length} seeds (${seeds.join(', ')}). Mean ranged ${meanRange[0].toFixed(2)} to ${meanRange[1].toFixed(2)}. ${Math.abs(meanRange[1] - meanRange[0]) < 2 ? 'Stable' : 'Variable'}.`,
      meanRange: [parseFloat(meanRange[0].toFixed(2)), parseFloat(meanRange[1].toFixed(2))],
      minRange: [parseFloat(minRange[0].toFixed(2)), parseFloat(minRange[1].toFixed(2))],
      maxRange: [parseFloat(maxRange[0].toFixed(2)), parseFloat(maxRange[1].toFixed(2))]
    },
    generatedBaseline: {
      note: "Will be updated after measuring current generated word performance with new bigram data.",
      gap: 0,
      generatedMean: 0,
      measuredAt: new Date().toISOString().split('T')[0]
    }
  };
  
  // Write baseline file
  const outputPath = path.join(process.cwd(), 'src/phonotactic/english-baseline.json');
  fs.writeFileSync(outputPath, JSON.stringify(baseline, null, 2) + '\n', 'utf8');
  
  console.log(`\n✅ Generated ${outputPath}`);
  console.log(`📊 English baseline stats:`);
  console.log(`   Mean: ${baseline.scores.mean}`);
  console.log(`   Median: ${baseline.scores.median}`);
  console.log(`   Min: ${baseline.scores.min}`);
  console.log(`   Max: ${baseline.scores.max}`);
  console.log(`   Stability: ${baseline.varianceAcrossSeeds.note}`);
  console.log(`\nNext steps:`);
  console.log(`  1. Run tests to measure generated word gap: npm test`);
  console.log(`  2. Update thresholds in phonotactic.test.ts if needed`);
  console.log(`  3. Update docs/phonotactic-scoring.md with new calibration`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
