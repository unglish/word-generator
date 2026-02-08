import { describe, it, expect } from 'vitest';
import { ipaToArpabet, wordToArpabet } from './ipa-to-arpabet.js';
import { generateAndScore } from './score.js';
import { generateWord } from '../core/generate.js';
import englishBaseline from './english-baseline.json' with { type: 'json' };

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

  it('generated words score within reasonable range of English baseline', () => {
    const generated = generateAndScore(100, 42);

    // Compare against cached English baseline (mean ~-19)
    // Generated words shouldn't be more than 20 points worse
    const gap = englishBaseline.scores.mean - generated.mean;
    console.log(`\n📊 Gap from English: ${gap.toFixed(2)} points (English mean: ${englishBaseline.scores.mean}, Generated mean: ${generated.mean.toFixed(2)})`);

    expect(gap).toBeLessThan(20);
  }, 120_000);

  it('no generated word scores catastrophically low', () => {
    const result = generateAndScore(100, 42);

    // Floor check: no word should score below -50
    expect(result.min).toBeGreaterThan(-50);
  }, 120_000);
});
