import { describe, it, expect } from 'vitest';
import { ipaToArpabet, wordToArpabet } from './ipa-to-arpabet.js';
import { generateAndScore } from './score.js';
import { generateWord } from '../core/generate.js';
import englishBaseline from './english-baseline.json' with { type: 'json' };

/**
 * Phonotactic scoring thresholds:
 * 
 * GATE (hard fail):     gap > 8 points from English baseline
 * REGRESSION (fail):    gap > previous baseline + 1 point
 * WARNING (log only):   gap > 5 points
 * TARGET:               gap = 0 (parity with English)
 */

const ABSOLUTE_GATE = 8;
const REGRESSION_TOLERANCE = 1;
const WARNING_THRESHOLD = 5;
const TARGET = 0;

const previousGap = englishBaseline.generatedBaseline.gap;

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

describe('Phonotactic scoring', () => {
  it('generated words — mean above threshold', () => {
    const result = generateAndScore(100, 42);

    console.log(`\n📊 Generated: mean=${result.mean.toFixed(2)} median=${result.median.toFixed(2)} min=${result.min.toFixed(2)} n=${result.words.length}`);

    // Generated words should have phonotactic scores > -35 on average
    expect(result.mean).toBeGreaterThan(-35);
    expect(result.words.length).toBeGreaterThan(0);
  }, 120_000);

  it('absolute gate: gap from English < 8 points', () => {
    const generated = generateAndScore(100, 42);
    const gap = englishBaseline.scores.mean - generated.mean;

    console.log(`\n📊 Gap: ${gap.toFixed(2)} points (English: ${englishBaseline.scores.mean}, Generated: ${generated.mean.toFixed(2)})`);
    console.log(`   🚫 Gate:       < ${ABSOLUTE_GATE}`);
    console.log(`   🔒 Regression: < ${(previousGap + REGRESSION_TOLERANCE).toFixed(2)} (previous ${previousGap} + ${REGRESSION_TOLERANCE})`);
    console.log(`   ⚠️  Warning:   < ${WARNING_THRESHOLD}`);
    console.log(`   🎯 Target:     ${TARGET}`);

    // Hard gate — must not exceed
    expect(gap, `GATE FAILED: gap ${gap.toFixed(2)} exceeds absolute gate of ${ABSOLUTE_GATE}`).toBeLessThan(ABSOLUTE_GATE);
  }, 120_000);

  it('regression gate: gap does not exceed previous baseline + 1', () => {
    const generated = generateAndScore(100, 42);
    const gap = englishBaseline.scores.mean - generated.mean;
    const regressionLimit = previousGap + REGRESSION_TOLERANCE;

    expect(gap, `REGRESSION: gap ${gap.toFixed(2)} exceeds previous baseline ${previousGap} + ${REGRESSION_TOLERANCE} tolerance`).toBeLessThan(regressionLimit);
  }, 120_000);

  it('quality warning: gap from English (informational)', () => {
    const generated = generateAndScore(100, 42);
    const gap = englishBaseline.scores.mean - generated.mean;

    if (gap > WARNING_THRESHOLD) {
      console.warn(`\n⚠️  WARNING: Gap is ${gap.toFixed(2)} — above warning threshold of ${WARNING_THRESHOLD}. Consider investigating.`);
    } else if (gap <= TARGET) {
      console.log(`\n🏆 TARGET ACHIEVED: Gap is ${gap.toFixed(2)} — at or better than English parity!`);
    } else {
      console.log(`\n✅ Gap ${gap.toFixed(2)} is within warning threshold. Target: ${TARGET}`);
    }

    // This test always passes — it's informational
    expect(true).toBe(true);
  }, 120_000);

  it('no generated word scores catastrophically low', () => {
    const result = generateAndScore(100, 42);

    // Floor check: no word should score below -50
    expect(result.min).toBeGreaterThan(-50);
  }, 120_000);
});
