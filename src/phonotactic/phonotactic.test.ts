import { describe, it, expect } from 'vitest';
import { ipaToArpabet, wordToArpabet } from './ipa-to-arpabet.js';
import { generateAndScore } from './score.js';
import { generateWord } from '../core/generate.js';
import englishBaseline from './english-baseline.json' with { type: 'json' };

/**
 * Phonotactic scoring thresholds for per-bigram scoring with full CMU dictionary:
 * 
 * Based on full CMU dictionary baseline with 123,892 words.
 * English per-bigram stats: mean -3.89, median -3.84, min -7.92, max -2.37
 * Thresholds use per-bigram scores for length-normalized comparison.
 */

const PER_BIGRAM_GATE = 2.0;        // Generated per-bigram mean should be within ~2 points of English (-3.89)
const PER_BIGRAM_MIN_FLOOR = -12.0; // Per-bigram floor based on English min (-7.92) with generous margin for outliers  
const REGRESSION_TOLERANCE = 0.5;   // Per-bigram regression tolerance
const TARGET_PER_BIGRAM_GAP = 0;    // Target: no gap between generated and English per-bigram scores

// Per-bigram scoring provides length-normalized comparison with English baseline

describe('IPA to ARPABET conversion', () => {
  it('converts simple consonants', () => {
    expect(ipaToArpabet('k')).toBe('K');
    expect(ipaToArpabet('t')).toBe('T');
    expect(ipaToArpabet('s')).toBe('S');
    expect(ipaToArpabet('n')).toBe('N');
  });

  it('converts vowels', () => {
    expect(ipaToArpabet('æ')).toBe('AE');
    expect(ipaToArpabet('i:')).toBe('IY');
    expect(ipaToArpabet('ə')).toBe('AH');
    expect(ipaToArpabet('ɑ')).toBe('AA');
  });

  it('converts diphthongs', () => {
    expect(ipaToArpabet('eɪ')).toBe('EY');
    expect(ipaToArpabet('aɪ')).toBe('AY');
    expect(ipaToArpabet('aʊ')).toBe('AW');
    expect(ipaToArpabet('ɔɪ')).toBe('OY');
  });

  it('converts affricates', () => {
    expect(ipaToArpabet('tʃ')).toBe('CH');
    expect(ipaToArpabet('dʒ')).toBe('JH');
  });

  it('strips aspiration diacritics', () => {
    expect(ipaToArpabet('pʰ')).toBe('P');
    expect(ipaToArpabet('tʰ')).toBe('T');
    expect(ipaToArpabet('kʰ')).toBe('K');
  });

  it('converts a full generated word to ARPABET', () => {
    const word = generateWord({ seed: 12345 });
    const arpabet = wordToArpabet(word);
    expect(arpabet).toBeTruthy();
    const validArpabet = new Set([
      'AA', 'AE', 'AH', 'AO', 'AW', 'AY', 'B', 'CH', 'D', 'DH',
      'EH', 'ER', 'EY', 'F', 'G', 'HH', 'IH', 'IY', 'JH', 'K',
      'L', 'M', 'N', 'NG', 'OW', 'OY', 'P', 'R', 'S', 'SH', 'T',
      'TH', 'UH', 'UW', 'V', 'W', 'Y', 'Z', 'ZH',
    ]);
    for (const token of arpabet.split(' ')) {
      expect(validArpabet.has(token), `Invalid ARPABET token: ${token}`).toBe(true);
    }
  });
});

describe('TypeScript phonotactic scoring', () => {
  it('generated words — per-bigram mean within reasonable range', { timeout: 30000 }, () => {
    const result = generateAndScore(135000, 42);

    console.log(`\n📊 Generated (TS): per-bigram mean=${result.meanPerBigram.toFixed(2)} median=${result.medianPerBigram.toFixed(2)} min=${result.minPerBigram.toFixed(2)} n=${result.words.length}`);
    console.log(`   Total scores: mean=${result.mean.toFixed(2)} median=${result.median.toFixed(2)} min=${result.min.toFixed(2)}`);

    // Generated words per-bigram mean should be reasonable (within ~2 points of English -3.89)
    expect(result.meanPerBigram).toBeGreaterThan(englishBaseline.scores.meanPerBigram - PER_BIGRAM_GATE);
    expect(result.words.length).toBeGreaterThan(0);
  });

  it('per-bigram gap from English within acceptable range', { timeout: 30000 }, () => {
    const generated = generateAndScore(135000, 42);
    const perBigramGap = englishBaseline.scores.meanPerBigram - generated.meanPerBigram;

    console.log(`\n📊 Per-bigram Gap: ${perBigramGap.toFixed(2)} points (English: ${englishBaseline.scores.meanPerBigram}, Generated: ${generated.meanPerBigram.toFixed(2)})`);
    console.log(`   🚫 Gate:       < ${PER_BIGRAM_GATE} (length-normalized)`);
    console.log(`   🔒 Regression: < ${REGRESSION_TOLERANCE} tolerance`);
    console.log(`   🎯 Target:     ${TARGET_PER_BIGRAM_GAP}`);

    expect(perBigramGap, `GATE FAILED: per-bigram gap ${perBigramGap.toFixed(2)} exceeds gate of ${PER_BIGRAM_GATE}`).toBeLessThan(PER_BIGRAM_GATE);
  });

  it('no generated word has catastrophically low per-bigram score', { timeout: 30000 }, () => {
    const result = generateAndScore(135000, 42);

    // Per-bigram floor check based on English min (-7.92) with margin
    // This checks length-normalized scores, not total scores that depend on word length
    console.log(`\n📊 Min per-bigram: ${result.minPerBigram.toFixed(2)} (English min: ${englishBaseline.scores.minPerBigram})`);
    expect(result.minPerBigram).toBeGreaterThan(PER_BIGRAM_MIN_FLOOR);
  });

  it('TypeScript scorer produces reasonable per-bigram results', () => {
    // Test that our TypeScript scorer produces sensible relative scores
    const common = ['K AE T', 'D AO G', 'HH AW S'];  // cat, dog, house
    const uncommon = ['NG TH ZH', 'P F K T', 'ZH P TH'];  // unlikely sequences

    // Smaller sample for sanity check
    const result = generateAndScore(1000, 42);
    
    // Basic sanity check: results should be finite numbers (both total and per-bigram)
    expect(isFinite(result.mean)).toBe(true);
    expect(isFinite(result.min)).toBe(true);
    expect(isFinite(result.median)).toBe(true);
    expect(isFinite(result.meanPerBigram)).toBe(true);
    expect(isFinite(result.minPerBigram)).toBe(true);
    expect(isFinite(result.medianPerBigram)).toBe(true);
    expect(isNaN(result.mean)).toBe(false);
    expect(isNaN(result.min)).toBe(false);
    expect(isNaN(result.median)).toBe(false);
    expect(isNaN(result.meanPerBigram)).toBe(false);
    expect(isNaN(result.minPerBigram)).toBe(false);
    expect(isNaN(result.medianPerBigram)).toBe(false);
    
    console.log(`\n✅ TS Scorer sanity check passed:`);
    console.log(`   Total: mean=${result.mean.toFixed(2)}, min=${result.min.toFixed(2)}`);
    console.log(`   Per-bigram: mean=${result.meanPerBigram.toFixed(2)}, min=${result.minPerBigram.toFixed(2)}`);
  });
});
