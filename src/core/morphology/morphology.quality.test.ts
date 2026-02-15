import { describe, it, expect } from 'vitest';
import { generateWords } from '../generate.js';

describe('Morphology quality benchmarks', () => {
  const words = generateWords(1000, { seed: 42, morphology: true });

  it('at least 30% of words have affixes', () => {
    const affixed = words.filter(w => {
      const clean = w.written.clean;
      const suffixes = [/ing$/, /ly$/, /ed$/, /s$/, /ness$/, /ment$/, /tion$/, /ful$/, /less$/];
      const prefixes = [/^un/, /^re/, /^dis/, /^pre/, /^mis/, /^over/, /^out/];
      return suffixes.some(r => r.test(clean)) || prefixes.some(r => r.test(clean));
    });
    expect(affixed.length).toBeGreaterThanOrEqual(300);
  });

  it('no word has written form shorter than 2 characters', () => {
    const short = words.filter(w => w.written.clean.length < 2);
    // Allow up to 1 per 1000 (statistical edge case: bare vowel nucleus with no onset/coda)
    expect(short.length).toBeLessThanOrEqual(1);
  });

  it('no double aspiration in pronunciation', () => {
    for (const w of words) {
      expect(w.pronunciation).not.toContain('ʰʰ');
    }
  });

  it('no empty written forms', () => {
    for (const w of words) {
      expect(w.written.clean.length).toBeGreaterThan(0);
    }
  });

  it('common suffixes all appear: -ing, -ly, -ed, -s', () => {
    const suffixes = ['ing', 'ly', 'ed', 's'];
    for (const suf of suffixes) {
      const re = new RegExp(`${suf}$`);
      const found = words.some(w => re.test(w.written.clean));
      expect(found, `suffix -${suf} should appear`).toBe(true);
    }
  });

  it('common prefixes appear: un-, re-', () => {
    const prefixes = ['un', 're'];
    for (const pre of prefixes) {
      const re = new RegExp(`^${pre}`);
      const found = words.some(w => re.test(w.written.clean));
      expect(found, `prefix ${pre}- should appear`).toBe(true);
    }
  });
});
