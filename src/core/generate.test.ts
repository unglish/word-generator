import { describe, it, expect } from 'vitest';
import { generateWord } from './generate';

describe('Word Generator', () => {
  it('generates word with specified syllable count', () => {
    const word = generateWord({ syllableCount: 3 });
    expect(word.syllables.length).toBe(3);
  });

  it('generates reproducible word with seed', () => {
    const word1 = generateWord({ seed: 12345 });
    const word2 = generateWord({ seed: 12345 });
    expect(word1.written.clean).toBe(word2.written.clean);
  });
});