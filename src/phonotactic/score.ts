/**
 * Pure TypeScript phonotactic scoring module.
 *
 * Replaces the Python UCI Phonotactic Calculator with a pure TypeScript solution
 * based on pre-computed ARPABET bigram frequencies. Uses the same scoring algorithm:
 * bigram conditional log-probabilities with Laplace smoothing.
 */

import { generateWord } from '../core/generate.js';
import { wordToArpabet } from './ipa-to-arpabet.js';
import { Word } from '../types.js';
import { ARPABET_BIGRAM_COUNTS, ARPABET_TOTAL_COUNTS, ALL_ARPABET_PHONEMES } from './arpabet-bigrams.js';

export interface ScoredWord {
  arpabet: string;
  score: number;
  perBigram: number;
}

export interface BatchScoreResult {
  words: ScoredWord[];
  mean: number;
  min: number;
  median: number;
  meanPerBigram: number;
  minPerBigram: number;
  medianPerBigram: number;
}

/**
 * Calculate the conditional log-probability of a phoneme bigram using Laplace smoothing.
 * 
 * P(second | first) = (count(first, second) + 1) / (count(first) + V)
 * where V is the vocabulary size (number of possible second phonemes).
 */
function getBigramLogProb(first: string, second: string): number {
  const bigramCounts = ARPABET_BIGRAM_COUNTS[first] || {};
  const bigramCount = bigramCounts[second] || 0;
  const totalCount = ARPABET_TOTAL_COUNTS[first] || 0;
  const vocabularySize = ALL_ARPABET_PHONEMES.size;

  // Laplace smoothing: add 1 to numerator, add V to denominator
  const smoothedProb = (bigramCount + 1) / (totalCount + vocabularySize);
  
  // Return log2 probability
  return Math.log2(smoothedProb);
}

/**
 * Score a single ARPABET word using bigram conditional probabilities.
 * 
 * For each bigram in the word (including word boundaries), calculate
 * log2(P(phoneme_i | phoneme_{i-1})) and sum them up.
 */
function scoreArpabetWord(arpabet: string): number {
  if (!arpabet.trim()) {
    return -Infinity;
  }

  const phonemes = arpabet.trim().split(/\s+/);
  if (phonemes.length === 0) {
    return -Infinity;
  }

  // Add word boundary markers
  const phonemesWithBoundaries = ['#', ...phonemes, '#'];
  
  let totalLogProb = 0;
  
  // Calculate bigram log probabilities
  for (let i = 1; i < phonemesWithBoundaries.length; i++) {
    const first = phonemesWithBoundaries[i - 1];
    const second = phonemesWithBoundaries[i];
    const logProb = getBigramLogProb(first, second);
    totalLogProb += logProb;
  }

  return totalLogProb;
}

/**
 * Score a list of ARPABET transcriptions using pure TypeScript bigram scorer.
 */
export function scoreArpabetWords(arpabetWords: string[]): ScoredWord[] {
  return arpabetWords.map(arpabet => {
    const score = scoreArpabetWord(arpabet);
    const phonemes = arpabet.trim().split(/\s+/);
    const bigramCount = phonemes.length + 1; // phoneme count + 1 for word boundaries
    const perBigram = bigramCount > 0 ? score / bigramCount : -Infinity;
    
    return {
      arpabet,
      score,
      perBigram,
    };
  });
}

/**
 * Generate N words and score them phonotactically.
 */
export function generateAndScore(count: number = 100, seed?: number): BatchScoreResult {
  const words: Word[] = [];
  const arpabetWords: string[] = [];

  for (let i = 0; i < count; i++) {
    const word = generateWord({ seed: seed !== undefined ? seed + i : undefined });
    const arpabet = wordToArpabet(word);
    if (arpabet.trim()) {
      words.push(word);
      arpabetWords.push(arpabet);
    }
  }

  const scored = scoreArpabetWords(arpabetWords);
  const scores = scored.map(s => s.score).filter(s => !isNaN(s) && isFinite(s));
  const perBigramScores = scored.map(s => s.perBigram).filter(s => !isNaN(s) && isFinite(s));
  
  scores.sort((a, b) => a - b);
  perBigramScores.sort((a, b) => a - b);

  return {
    words: scored,
    mean: scores.reduce((a, b) => a + b, 0) / scores.length,
    min: scores[0] ?? 0,
    median: scores[Math.floor(scores.length / 2)] ?? 0,
    meanPerBigram: perBigramScores.reduce((a, b) => a + b, 0) / perBigramScores.length,
    minPerBigram: perBigramScores[0] ?? 0,
    medianPerBigram: perBigramScores[Math.floor(perBigramScores.length / 2)] ?? 0,
  };
}

/**
 * Score a list of real English words (in ARPABET) for baseline comparison.
 */
export function scoreEnglishBaseline(): BatchScoreResult {
  // Common English words in ARPABET
  const englishWords = [
    'K AE T',       // cat
    'D AO G',       // dog
    'HH AW S',      // house
    'W ER D',       // word
    'B UH K',       // book
    'L AY T',       // light
    'S T R IY T',   // street
    'G R IY N',     // green
    'F L AW ER',    // flower
    'M AH DH ER',   // mother
    'W AO T ER',    // water
    'CH IH L D',    // child
    'P L EY',       // play
    'S K UW L',     // school
    'HH AE P IY',   // happy
    'R AH N IH NG', // running
    'B IH G',       // big
    'S M AO L',     // small
    'F R EH N D',   // friend
    'T AY M',       // time
  ];

  const scored = scoreArpabetWords(englishWords);
  const scores = scored.map(s => s.score).filter(s => !isNaN(s) && isFinite(s));
  const perBigramScores = scored.map(s => s.perBigram).filter(s => !isNaN(s) && isFinite(s));
  
  scores.sort((a, b) => a - b);
  perBigramScores.sort((a, b) => a - b);

  return {
    words: scored,
    mean: scores.reduce((a, b) => a + b, 0) / scores.length,
    min: scores[0] ?? 0,
    median: scores[Math.floor(scores.length / 2)] ?? 0,
    meanPerBigram: perBigramScores.reduce((a, b) => a + b, 0) / perBigramScores.length,
    minPerBigram: perBigramScores[0] ?? 0,
    medianPerBigram: perBigramScores[Math.floor(perBigramScores.length / 2)] ?? 0,
  };
}
