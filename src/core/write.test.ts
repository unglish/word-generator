import { describe, it, expect } from 'vitest';
import { repairConsonantPileups } from './write';
import { generateWord, createGenerator } from './generate';
import { englishConfig } from '../config/english';

describe('repairConsonantPileups', () => {
  it('does nothing when no run exceeds max', () => {
    const clean = ['stri', 'ble'];
    const hyph = ['stri', '&shy;', 'ble'];
    repairConsonantPileups(clean, hyph, 4);
    expect(clean.join('')).toBe('strible');
  });

  it('trims a 5-consonant run across syllable boundary', () => {
    const clean = ['strng', 'ths'];
    const hyph = ['strng', '&shy;', 'ths'];
    repairConsonantPileups(clean, hyph, 4);
    const word = clean.join('');
    // Count max consecutive consonant letters
    const maxRun = getMaxConsonantRun(word);
    expect(maxRun).toBeLessThanOrEqual(4);
  });

  it('trims a 6-consonant run', () => {
    const clean = ['splch', 'kren'];
    const hyph = ['splch', '&shy;', 'kren'];
    repairConsonantPileups(clean, hyph, 4);
    const maxRun = getMaxConsonantRun(clean.join(''));
    expect(maxRun).toBeLessThanOrEqual(4);
  });

  it('handles run within a single syllable', () => {
    const clean = ['strngths'];
    const hyph = ['strngths'];
    repairConsonantPileups(clean, hyph, 4);
    const maxRun = getMaxConsonantRun(clean.join(''));
    expect(maxRun).toBeLessThanOrEqual(4);
  });

  it('respects configurable max of 3', () => {
    const clean = ['blrt', 'fen'];
    const hyph = ['blrt', '&shy;', 'fen'];
    repairConsonantPileups(clean, hyph, 3);
    const maxRun = getMaxConsonantRun(clean.join(''));
    expect(maxRun).toBeLessThanOrEqual(3);
  });

  it('updates hyphenatedParts in sync', () => {
    const clean = ['strng', 'ths'];
    const hyph = ['strng', '&shy;', 'ths'];
    repairConsonantPileups(clean, hyph, 4);
    expect(hyph[0]).toBe(clean[0]);
    expect(hyph[2]).toBe(clean[1]);
  });
});

describe('consonant pileup integration', () => {
  it('generates 100k words with no 5+ consonant letter runs', { timeout: 120_000 }, () => {
    let violations = 0;
    for (let i = 0; i < 100_000; i++) {
      const word = generateWord({ seed: i });
      if (getMaxConsonantRun(word.written.clean) > 4) {
        violations++;
      }
    }
    expect(violations).toBe(0);
  });

  it('with max=3, generates 10k words with no 4+ consonant letter runs', () => {
    const customConfig = {
      ...englishConfig,
      writtenFormConstraints: { maxConsonantLetters: 3 },
    };
    const gen = createGenerator(customConfig);
    let violations = 0;
    for (let i = 0; i < 10_000; i++) {
      const word = gen.generateWord({ seed: i });
      if (getMaxConsonantRun(word.written.clean) > 3) {
        violations++;
      }
    }
    expect(violations).toBe(0);
  });
});

function getMaxConsonantRun(word: string): number {
  const vowels = new Set(['a', 'e', 'i', 'o', 'u', 'y']);
  let max = 0;
  let run = 0;
  for (const ch of word.toLowerCase()) {
    if (!vowels.has(ch)) {
      run++;
      if (run > max) max = run;
    } else {
      run = 0;
    }
  }
  return max;
}
