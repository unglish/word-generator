import { describe, it, expect } from 'vitest';
import { ipaToArpabet, wordToArpabet } from './ipa-to-arpabet.js';
import { scoreEnglishBaseline, generateAndScore, scoreArpabetWords } from './score.js';
import { generateWord } from '../core/generate.js';

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
    // All tokens should be valid ARPABET symbols
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
  it('scores real English words with reasonable values', () => {
    const baseline = scoreEnglishBaseline();

    // English words should have a mean score better (less negative) than -20
    expect(baseline.mean).toBeGreaterThan(-20);
    // No word should score worse than -25
    expect(baseline.min).toBeGreaterThan(-25);
    expect(baseline.words.length).toBe(20);
  }, 60_000);

  it('scores generated words — mean above threshold', () => {
    const result = generateAndScore(50, 42);

    // Generated words should have phonotactic scores > -35 on average
    // This is a generous threshold; real English averages ~-12
    expect(result.mean).toBeGreaterThan(-35);
    expect(result.words.length).toBeGreaterThan(0);
  }, 120_000);

  it('generated words score within a reasonable range of English baseline', () => {
    const baseline = scoreEnglishBaseline();
    const generated = generateAndScore(50, 42);

    // Generated words shouldn't be more than 25 points worse than English on average.
    // This ensures they're at least somewhat English-like, not random noise.
    const gap = baseline.mean - generated.mean;
    expect(gap).toBeLessThan(25);
  }, 120_000);

  it('no generated word scores catastrophically low', () => {
    const result = generateAndScore(50, 42);

    // Floor check: no word should score below -50
    expect(result.min).toBeGreaterThan(-50);
  }, 120_000);
});
