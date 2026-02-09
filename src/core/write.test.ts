import { describe, it, expect } from 'vitest';
import { repairConsonantPileups, repairJunctions, tokenizeGraphemes } from './write';
import { generateWord, createGenerator } from './generate';
import { englishConfig } from '../config/english';

// ---------------------------------------------------------------------------
// tokenizeGraphemes
// ---------------------------------------------------------------------------

describe('tokenizeGraphemes', () => {
  it('splits digraphs and trigraphs as atomic units', () => {
    expect(tokenizeGraphemes('tchwng')).toEqual(['tch', 'w', 'ng']);
  });

  it('handles plain letters', () => {
    expect(tokenizeGraphemes('str')).toEqual(['s', 't', 'r']);
  });

  it('handles mixed vowels and consonants', () => {
    expect(tokenizeGraphemes('strengths')).toEqual(['s', 't', 'r', 'e', 'ng', 'th', 's']);
  });

  it('handles "dge"', () => {
    expect(tokenizeGraphemes('bridge')).toEqual(['b', 'r', 'i', 'dge']);
  });

  it('handles empty string', () => {
    expect(tokenizeGraphemes('')).toEqual([]);
  });

  it('handles "ck"', () => {
    expect(tokenizeGraphemes('ckstr')).toEqual(['ck', 's', 't', 'r']);
  });
});

// ---------------------------------------------------------------------------
// repairConsonantPileups (grapheme-aware)
// ---------------------------------------------------------------------------

describe('repairConsonantPileups', () => {
  it('does nothing when no run exceeds max', () => {
    const clean = ['stri', 'ble'];
    const hyph = ['stri', '&shy;', 'ble'];
    repairConsonantPileups(clean, hyph, 4);
    expect(clean.join('')).toBe('strible');
  });

  it('trims a 5-consonant-grapheme run across syllable boundary', () => {
    const clean = ['strng', 'ths'];
    const hyph = ['strng', '&shy;', 'ths'];
    repairConsonantPileups(clean, hyph, 4);
    const word = clean.join('');
    const maxRun = getMaxConsonantGraphemeRun(word);
    expect(maxRun).toBeLessThanOrEqual(4);
  });

  it('treats "tch" as a single grapheme unit', () => {
    // "tch" = 1 unit, "s" = 1 unit, "t" = 1 unit → 3 units total, under limit of 4
    const clean = ['atch', 'str'];
    const hyph = ['atch', '&shy;', 'str'];
    repairConsonantPileups(clean, hyph, 4);
    // "tchstr" → tokens: tch, s, t, r = 4 consonant grapheme units → should be fine
    expect(clean.join('')).toBe('atchstr');
  });

  it('does not split "tch" when dropping', () => {
    // "tch" + "str" + "k" = 5 tokens → needs to drop 1
    const clean = ['atch', 'strk'];
    const hyph = ['atch', '&shy;', 'strk'];
    repairConsonantPileups(clean, hyph, 4);
    const word = clean.join('');
    // Verify tch is never split into "th" or "tc"
    expect(word).not.toMatch(/tc[^h]/);
    expect(word).not.toContain('tcs');
    const maxRun = getMaxConsonantGraphemeRun(word);
    expect(maxRun).toBeLessThanOrEqual(4);
  });

  it('handles run within a single syllable', () => {
    const clean = ['strngths'];
    const hyph = ['strngths'];
    repairConsonantPileups(clean, hyph, 4);
    const maxRun = getMaxConsonantGraphemeRun(clean.join(''));
    expect(maxRun).toBeLessThanOrEqual(4);
  });

  it('respects configurable max of 3', () => {
    const clean = ['blrt', 'fen'];
    const hyph = ['blrt', '&shy;', 'fen'];
    repairConsonantPileups(clean, hyph, 3);
    const maxRun = getMaxConsonantGraphemeRun(clean.join(''));
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

// ---------------------------------------------------------------------------
// repairJunctions
// ---------------------------------------------------------------------------

describe('repairJunctions', () => {
  const attested: [string, string][] = [
    ['n', 't'], ['s', 't'], ['r', 't'], ['l', 't'],
    ['n', 's'], ['r', 's'],
  ];

  it('does nothing for attested junction', () => {
    const clean = ['ans', 'ter'];
    const hyph = ['ans', '&shy;', 'ter'];
    repairJunctions(clean, hyph, attested);
    expect(clean.join('')).toBe('anster');
  });

  it('drops coda consonant for unattested junction', () => {
    const clean = ['awkt', 'wer'];
    const hyph = ['awkt', '&shy;', 'wer'];
    repairJunctions(clean, hyph, attested);
    // t→w is not attested, so drop t; then k→w not attested, drop k
    const word = clean.join('');
    expect(word).not.toContain('tw');
    expect(word).not.toContain('kw');
  });

  it('handles empty coda', () => {
    const clean = ['a', 'ter'];
    const hyph = ['a', '&shy;', 'ter'];
    repairJunctions(clean, hyph, attested);
    expect(clean.join('')).toBe('ater');
  });
});

// ---------------------------------------------------------------------------
// Integration tests
// ---------------------------------------------------------------------------

describe('consonant pileup integration', () => {
  it('generates 100k words with no 5+ consonant grapheme runs', { timeout: 120_000 }, () => {
    let violations = 0;
    for (let i = 0; i < 100_000; i++) {
      const word = generateWord({ seed: i });
      if (getMaxConsonantGraphemeRun(word.written.clean) > 4) {
        violations++;
      }
    }
    expect(violations).toBe(0);
  });

  it('with max=3, generates 10k words with no 4+ consonant grapheme runs', () => {
    const customConfig = {
      ...englishConfig,
      writtenFormConstraints: {
        ...englishConfig.writtenFormConstraints,
        maxConsonantGraphemes: 3,
      },
    };
    const gen = createGenerator(customConfig);
    let violations = 0;
    for (let i = 0; i < 10_000; i++) {
      const word = gen.generateWord({ seed: i });
      if (getMaxConsonantGraphemeRun(word.written.clean) > 3) {
        violations++;
      }
    }
    expect(violations).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMaxConsonantGraphemeRun(word: string): number {
  const graphemeList = ["tch", "dge", "ch", "sh", "th", "ng", "ph", "wh", "ck"];
  const tokens = tokenizeGraphemes(word.toLowerCase(), graphemeList);
  const vowels = new Set(['a', 'e', 'i', 'o', 'u', 'y']);
  let max = 0;
  let run = 0;
  for (const token of tokens) {
    let isVowel = false;
    for (const ch of token) {
      if (vowels.has(ch)) { isVowel = true; break; }
    }
    if (!isVowel) {
      run++;
      if (run > max) max = run;
    } else {
      run = 0;
    }
  }
  return max;
}
