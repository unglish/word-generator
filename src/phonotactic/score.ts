/**
 * Pure TypeScript phonotactic scoring module.
 *
 * Scores ARPABET phoneme sequences using bigram conditional log-probabilities
 * with Laplace smoothing, derived from CMU Pronouncing Dictionary frequencies.
 */

import { ARPABET_BIGRAM_COUNTS, ARPABET_TOTAL_COUNTS, ALL_ARPABET_PHONEMES } from './arpabet-bigrams.js';

export interface ScoredWord {
  arpabet: string;
  score: number;
  perBigram: number;
}

export interface ScoreStats {
  mean: number;
  min: number;
  median: number;
}

export interface BatchScoreResult {
  words: ScoredWord[];
  total: ScoreStats;
  perBigram: ScoreStats;
}

/**
 * Compute mean, min, and median from a sorted array of numbers.
 */
function computeStats(values: number[]): ScoreStats {
  if (values.length === 0) return { mean: 0, min: 0, median: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  return {
    mean: sorted.reduce((a, b) => a + b, 0) / sorted.length,
    min: sorted[0],
    median: sorted[Math.floor(sorted.length / 2)],
  };
}

/**
 * Conditional log₂-probability of a phoneme bigram with Laplace smoothing.
 *
 *   P(second | first) = (count(first→second) + 1) / (count(first→*) + V)
 */
function bigramLogProb(first: string, second: string): number {
  const counts = ARPABET_BIGRAM_COUNTS[first] || {};
  const vocabSize = ALL_ARPABET_PHONEMES.size;
  return Math.log2(((counts[second] || 0) + 1) / ((ARPABET_TOTAL_COUNTS[first] || 0) + vocabSize));
}

/**
 * Score a single ARPABET transcription.
 *
 * Sums log₂ P(phoneme_i | phoneme_{i-1}) across all bigrams,
 * including word-boundary markers (#).
 */
function scoreWord(arpabet: string): number {
  const phonemes = arpabet.trim().split(/\s+/);
  if (phonemes.length === 0 || !phonemes[0]) return -Infinity;

  const seq = ['#', ...phonemes, '#'];
  let total = 0;
  for (let i = 1; i < seq.length; i++) {
    total += bigramLogProb(seq[i - 1], seq[i]);
  }
  return total;
}

/**
 * Score a batch of ARPABET transcriptions and return per-word scores plus aggregate stats.
 */
export function scoreArpabetWords(arpabetWords: string[]): BatchScoreResult {
  const words = arpabetWords.map(arpabet => {
    const score = scoreWord(arpabet);
    const bigramCount = arpabet.trim().split(/\s+/).length + 1;
    return {
      arpabet,
      score,
      perBigram: bigramCount > 0 ? score / bigramCount : -Infinity,
    };
  });

  const finite = (v: number) => isFinite(v) && !isNaN(v);
  const totalScores = words.map(w => w.score).filter(finite);
  const perBigramScores = words.map(w => w.perBigram).filter(finite);

  return {
    words,
    total: computeStats(totalScores),
    perBigram: computeStats(perBigramScores),
  };
}
