import { describe, it, expect } from 'vitest';
import { repairConsonantPileups, repairJunctions, repairConsonantLetters, repairVowelLetters, tokenizeGraphemes, isJunctionValid, mannerGroup, placeGroup, isCoronal, filterByPosition, SyllableBoundary, applySilentE } from './write';
import { generateWord, createGenerator } from './generate';
import { englishConfig } from '../config/english';
import { Phoneme } from '../types';

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
    const clean = ['atch', 'str'];
    const hyph = ['atch', '&shy;', 'str'];
    repairConsonantPileups(clean, hyph, 4);
    expect(clean.join('')).toBe('atchstr');
  });

  it('does not split "tch" when dropping', () => {
    const clean = ['atch', 'strk'];
    const hyph = ['atch', '&shy;', 'strk'];
    repairConsonantPileups(clean, hyph, 4);
    const word = clean.join('');
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
// Articulatory helper tests
// ---------------------------------------------------------------------------

// Helper to create minimal phoneme objects for testing
function makePhoneme(overrides: Partial<Phoneme> & { sound: string; mannerOfArticulation: Phoneme['mannerOfArticulation']; placeOfArticulation: Phoneme['placeOfArticulation'] }): Phoneme {
  return {
    voiced: false,
    startWord: 1,
    midWord: 1,
    endWord: 1,
    ...overrides,
  };
}

// Some commonly-needed test phonemes
const P_t = makePhoneme({ sound: 't', mannerOfArticulation: 'stop', placeOfArticulation: 'alveolar' });
const P_d = makePhoneme({ sound: 'd', mannerOfArticulation: 'stop', placeOfArticulation: 'alveolar', voiced: true });
const P_p = makePhoneme({ sound: 'p', mannerOfArticulation: 'stop', placeOfArticulation: 'bilabial' });
const P_k = makePhoneme({ sound: 'k', mannerOfArticulation: 'stop', placeOfArticulation: 'velar' });
const P_g = makePhoneme({ sound: 'g', mannerOfArticulation: 'stop', placeOfArticulation: 'velar', voiced: true });
const P_b = makePhoneme({ sound: 'b', mannerOfArticulation: 'stop', placeOfArticulation: 'bilabial', voiced: true });
const P_s = makePhoneme({ sound: 's', mannerOfArticulation: 'sibilant', placeOfArticulation: 'alveolar' });
const P_ʃ = makePhoneme({ sound: 'ʃ', mannerOfArticulation: 'sibilant', placeOfArticulation: 'postalveolar' });
const P_f = makePhoneme({ sound: 'f', mannerOfArticulation: 'fricative', placeOfArticulation: 'labiodental' });
const P_v = makePhoneme({ sound: 'v', mannerOfArticulation: 'fricative', placeOfArticulation: 'labiodental', voiced: true });
const P_θ = makePhoneme({ sound: 'θ', mannerOfArticulation: 'fricative', placeOfArticulation: 'dental' });
const P_n = makePhoneme({ sound: 'n', mannerOfArticulation: 'nasal', placeOfArticulation: 'alveolar' });
const P_m = makePhoneme({ sound: 'm', mannerOfArticulation: 'nasal', placeOfArticulation: 'bilabial' });
const P_ŋ = makePhoneme({ sound: 'ŋ', mannerOfArticulation: 'nasal', placeOfArticulation: 'velar' });
const P_l = makePhoneme({ sound: 'l', mannerOfArticulation: 'lateralApproximant', placeOfArticulation: 'alveolar' });
const P_r = makePhoneme({ sound: 'r', mannerOfArticulation: 'liquid', placeOfArticulation: 'postalveolar' });
const P_w = makePhoneme({ sound: 'w', mannerOfArticulation: 'glide', placeOfArticulation: 'labial-velar' });

describe('mannerGroup', () => {
  it('maps sibilant to fricative', () => {
    expect(mannerGroup(P_s)).toBe('fricative');
  });
  it('maps lateralApproximant to liquid', () => {
    expect(mannerGroup(P_l)).toBe('liquid');
  });
  it('passes through stop', () => {
    expect(mannerGroup(P_t)).toBe('stop');
  });
});

describe('placeGroup', () => {
  it('groups bilabial as labial', () => {
    expect(placeGroup(P_p)).toBe('labial');
  });
  it('groups alveolar as coronal', () => {
    expect(placeGroup(P_t)).toBe('coronal');
  });
  it('groups velar as dorsal', () => {
    expect(placeGroup(P_k)).toBe('dorsal');
  });
  it('groups labial-velar as labial', () => {
    expect(placeGroup(P_w)).toBe('labial');
  });
});

describe('isCoronal', () => {
  it('true for alveolar', () => {
    expect(isCoronal(P_t)).toBe(true);
  });
  it('true for postalveolar', () => {
    expect(isCoronal(P_ʃ)).toBe(true);
  });
  it('false for bilabial', () => {
    expect(isCoronal(P_p)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isJunctionValid — 7 articulatory rules
// ---------------------------------------------------------------------------

describe('isJunctionValid', () => {
  describe('F1: identical phonemes', () => {
    it('rejects identical sounds', () => {
      expect(isJunctionValid(P_t, P_t, [P_t])).toBe(false);
    });
  });

  describe('F2: same manner + same place', () => {
    it('rejects t→d (both stop+coronal)', () => {
      expect(isJunctionValid(P_t, P_d, [P_d])).toBe(false);
    });
    it('rejects f→v (both fricative+labial)', () => {
      expect(isJunctionValid(P_f, P_v, [P_v])).toBe(false);
    });
  });

  describe('P1: s-exception', () => {
    it('allows s as coda before anything', () => {
      expect(isJunctionValid(P_s, P_p, [P_p])).toBe(true);
    });
    it('allows onset s+stop cluster', () => {
      expect(isJunctionValid(P_n, P_s, [P_s, P_t])).toBe(true);
    });
  });

  describe('P2: coronal onset', () => {
    it('allows any coda before coronal onset', () => {
      expect(isJunctionValid(P_k, P_t, [P_t])).toBe(true);
    });
    it('allows labial coda before alveolar onset', () => {
      expect(isJunctionValid(P_p, P_n, [P_n])).toBe(true);
    });
  });

  describe('P3: homorganic nasal+stop', () => {
    it('allows ŋ→k (both dorsal)', () => {
      expect(isJunctionValid(P_ŋ, P_k, [P_k])).toBe(true);
    });
    it('allows m→p (both labial)', () => {
      expect(isJunctionValid(P_m, P_p, [P_p])).toBe(true);
    });
  });

  describe('P4: manner change', () => {
    it('allows nasal→fricative (different manner)', () => {
      expect(isJunctionValid(P_n, P_f, [P_f])).toBe(true);
    });
    it('allows stop→liquid (different manner)', () => {
      expect(isJunctionValid(P_k, P_r, [P_r])).toBe(true);
    });
  });

  describe('P5: place change', () => {
    it('allows f→θ (different place, same manner, both non-stop)', () => {
      expect(isJunctionValid(P_f, P_θ, [P_θ])).toBe(true);
    });
    it('allows l→r (different place — alveolar vs postalveolar)', () => {
      expect(isJunctionValid(P_l, P_r, [P_r])).toBe(true);
    });
    it('allows r→l (different place — postalveolar vs alveolar)', () => {
      expect(isJunctionValid(P_r, P_l, [P_l])).toBe(true);
    });
  });

  describe('F3: non-coronal stop+stop', () => {
    it('rejects b→k (both non-coronal stops)', () => {
      expect(isJunctionValid(P_p, P_k, [P_k])).toBe(false);
    });
    it('allows k→t (t is coronal)', () => {
      expect(isJunctionValid(P_k, P_t, [P_t])).toBe(true);
    });
    it('allows p→t (t is coronal)', () => {
      expect(isJunctionValid(P_p, P_t, [P_t])).toBe(true);
    });
  });

  describe('F4: stop+stop voicing disagreement', () => {
    it('rejects d→k (voiced+voiceless)', () => {
      expect(isJunctionValid(P_d, P_k, [P_k])).toBe(false);
    });
    it('rejects b→t (voiced+voiceless)', () => {
      expect(isJunctionValid(P_b, P_t, [P_t])).toBe(false);
    });
    it('rejects g→p (voiced+voiceless)', () => {
      expect(isJunctionValid(P_g, P_p, [P_p])).toBe(false);
    });
    it('allows k→t (voiceless+voiceless)', () => {
      expect(isJunctionValid(P_k, P_t, [P_t])).toBe(true);
    });
    it('allows g→d (voiced+voiced)', () => {
      expect(isJunctionValid(P_g, P_d, [P_d])).toBe(true);
    });
    it('allows b→d (voiced+voiced)', () => {
      expect(isJunctionValid(P_b, P_d, [P_d])).toBe(true);
    });
  });

  describe('default fail', () => {
    // This is hard to trigger since P4 or P5 usually catches things.
    // Same manner + same place is caught by F2, so default fail is rare.
    // We test that F2 catches it.
    it('F2 catches same manner+place before default', () => {
      expect(isJunctionValid(P_k, P_g, [P_g])).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// repairJunctions (feature-based)
// ---------------------------------------------------------------------------

describe('repairJunctions (feature-based)', () => {
  it('does nothing for valid junction', () => {
    // n→f: different manner (nasal vs fricative) → P4 pass
    const boundaries: SyllableBoundary[] = [{
      codaFinal: P_n,
      onsetInitial: P_f,
      onsetCluster: [P_f],
    }];
    const clean = ['an', 'fe'];
    const hyph = ['an', '&shy;', 'fe'];
    repairJunctions(clean, hyph, boundaries);
    expect(clean.join('')).toBe('anfe');
  });

  it('drops coda consonant for invalid junction (F2: t→d)', () => {
    const boundaries: SyllableBoundary[] = [{
      codaFinal: P_t,
      onsetInitial: P_d,
      onsetCluster: [P_d],
    }];
    const clean = ['art', 'de'];
    const hyph = ['art', '&shy;', 'de'];
    repairJunctions(clean, hyph, boundaries);
    expect(clean[0]).toBe('ar');
  });

  it('handles empty coda', () => {
    const boundaries: SyllableBoundary[] = [{
      codaFinal: undefined,
      onsetInitial: P_t,
      onsetCluster: [P_t],
    }];
    const clean = ['a', 'ter'];
    const hyph = ['a', '&shy;', 'ter'];
    repairJunctions(clean, hyph, boundaries);
    expect(clean.join('')).toBe('ater');
  });

  it('removes doubled consonant grapheme fully for invalid junction (dd→k)', () => {
    // d→k: voiced stop + voiceless stop → F4 fail
    const boundaries: SyllableBoundary[] = [{
      codaFinal: P_d,
      onsetInitial: P_k,
      onsetCluster: [P_k],
    }];
    const clean = ['ridd', 'kerng'];
    const hyph = ['ridd', '&shy;', 'kerng'];
    repairJunctions(clean, hyph, boundaries);
    // Both d's should be stripped across multiple passes
    expect(clean[0]).toBe('ri');
    expect(clean.join('')).toBe('rikerng');
  });
});

// ---------------------------------------------------------------------------
// repairConsonantLetters
// ---------------------------------------------------------------------------

describe('repairConsonantLetters', () => {
  it('does nothing when under limit', () => {
    const clean = ['str', 'ong'];
    const hyph = ['str', '&shy;', 'ong'];
    repairConsonantLetters(clean, hyph, 4);
    expect(clean.join('')).toBe('strong');
  });

  it('trims 5 consonant letters to 4', () => {
    const clean = ['strnk', 'a'];
    const hyph = ['strnk', '&shy;', 'a'];
    repairConsonantLetters(clean, hyph, 4);
    const word = clean.join('');
    const maxRun = getMaxConsonantLetterRun(word);
    expect(maxRun).toBeLessThanOrEqual(4);
  });
});

// ---------------------------------------------------------------------------
// repairVowelLetters
// ---------------------------------------------------------------------------

describe('repairVowelLetters', () => {
  it('trims 3 consecutive vowels to 2', () => {
    const clean = ['drogeoom'];
    const hyph = ['drogeoom'];
    repairVowelLetters(clean, hyph, 2);
    expect(clean[0]).toBe('drogeom');
  });

  it('trims initial vowel run', () => {
    const clean = ['eaorts'];
    const hyph = ['eaorts'];
    repairVowelLetters(clean, hyph, 2);
    expect(clean[0]).toBe('earts');
  });

  it('does nothing when vowels are within limit', () => {
    const clean = ['steam'];
    const hyph = ['steam'];
    repairVowelLetters(clean, hyph, 2);
    expect(clean[0]).toBe('steam');
  });

  it('treats word-initial Y before vowel as consonant (not part of vowel run)', () => {
    const clean = ['yoarts'];
    const hyph = ['yoarts'];
    repairVowelLetters(clean, hyph, 2);
    // Y is consonantal here, so vowel run is 'oa' (2) — within limit, no trimming
    expect(clean[0]).toBe('yoarts');
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

  it('generates 100k words with no 5+ consonant letter runs', { timeout: 120_000 }, () => {
    let violations = 0;
    for (let i = 0; i < 100_000; i++) {
      const word = generateWord({ seed: i });
      if (getMaxConsonantLetterRun(word.written.clean) > 4) {
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

function getMaxConsonantLetterRun(word: string): number {
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

// ---------------------------------------------------------------------------
// filterByPosition
// ---------------------------------------------------------------------------

describe('filterByPosition', () => {
  const makeGrapheme = (overrides: Partial<import('../types').Grapheme> = {}): import('../types').Grapheme => ({
    phoneme: 'test', form: 'x', origin: 0, frequency: 10,
    startWord: 5, midWord: 5, endWord: 5,
    ...overrides,
  });

  it('returns empty array when all candidates have midWord: 0 and position is mid-word', () => {
    const candidates = [
      makeGrapheme({ form: 'igh', midWord: 0 }),
      makeGrapheme({ form: 'ough', midWord: 0 }),
    ];
    const result = filterByPosition(candidates, false, false, false);
    expect(result).toEqual([]);
  });

  it('returns candidates with midWord > 0 when mid-word', () => {
    const candidates = [
      makeGrapheme({ form: 'igh', midWord: 0 }),
      makeGrapheme({ form: 'i', midWord: 5 }),
    ];
    const result = filterByPosition(candidates, false, false, false);
    expect(result).toHaveLength(1);
    expect(result[0].form).toBe('i');
  });

  it('does not filter by midWord at start of word', () => {
    const candidates = [
      makeGrapheme({ form: 'a', midWord: 0, startWord: 5 }),
    ];
    const result = filterByPosition(candidates, false, true, false);
    expect(result).toHaveLength(1);
  });

  it('does not filter by midWord at end of word', () => {
    const candidates = [
      makeGrapheme({ form: 'a', midWord: 0, endWord: 5 }),
    ];
    const result = filterByPosition(candidates, false, false, true);
    expect(result).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// igh/ough mid-word integration
// ---------------------------------------------------------------------------

import { generateWords } from './generate';

describe('igh/ough mid-word filtering', () => {
  it('no "ight" or "ought" substrings appear mid-word in 10k words', () => {
    const words = generateWords(10000, { seed: 42 });
    const midWordViolations: string[] = [];

    for (const w of words) {
      const written = w.written.clean.toLowerCase();
      // Check for ight/ought NOT at the end of the word (mid-word occurrence)
      for (const pattern of ['ight', 'ought']) {
        let idx = written.indexOf(pattern);
        while (idx !== -1) {
          // It's mid-word if pattern doesn't reach the end
          if (idx + pattern.length < written.length) {
            midWordViolations.push(`"${w.written}" contains "${pattern}" mid-word`);
          }
          idx = written.indexOf(pattern, idx + 1);
        }
      }
    }

    expect(midWordViolations).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// applySilentE
// ---------------------------------------------------------------------------

describe('applySilentE', () => {
  // Helper to build a minimal phoneme
  function ph(sound: string, extras: Partial<Phoneme> = {}): Phoneme {
    return {
      sound,
      voiced: false,
      mannerOfArticulation: 'stop',
      placeOfArticulation: 'alveolar',
      startWord: 1,
      midWord: 1,
      endWord: 1,
      ...extras,
    };
  }

  const lookup = new Map([
    ['eɪ', [{ from: 'ai', to: 'a' }]],
    ['i:', [{ from: 'ee', to: 'e' }, { from: 'ea', to: 'e' }]],
    ['aɪ', [{ from: 'igh', to: 'i' }, { from: 'ie', to: 'i' }]],
    ['o', [{ from: 'oa', to: 'o' }]],
    ['u', [{ from: 'oo', to: 'u' }, { from: 'ue', to: 'u' }]],
  ]);
  const excluded = new Set(['w', 'j', 'h']);

  it('converts "maik" to "make" for /eɪk/', () => {
    const clean = ['maik'];
    const hyph = ['maik'];
    const syllables = [{ onset: [ph('m')], nucleus: [ph('eɪ')], coda: [ph('k')] }];
    applySilentE(clean, hyph, syllables, ['ai'], lookup, excluded, 100, () => 0);
    expect(clean[0]).toBe('make');
  });

  it('converts "hoap" to "hope" for /oʊp/ with nucleus "oa"', () => {
    const clean = ['hoap'];
    const hyph = ['hoap'];
    const syllables = [{ onset: [ph('h')], nucleus: [ph('o')], coda: [ph('p')] }];
    applySilentE(clean, hyph, syllables, ['oa'], lookup, excluded, 100, () => 0);
    expect(clean[0]).toBe('hope');
  });

  it('converts "tighm" to "time" for /aɪm/ with nucleus "igh"', () => {
    const clean = ['tighm'];
    const hyph = ['tighm'];
    const syllables = [{ onset: [ph('t')], nucleus: [ph('aɪ')], coda: [ph('m')] }];
    applySilentE(clean, hyph, syllables, ['igh'], lookup, excluded, 100, () => 0);
    expect(clean[0]).toBe('time');
  });

  it('does not apply when coda has 2+ consonants', () => {
    const clean = ['maiks'];
    const hyph = ['maiks'];
    const syllables = [{ onset: [ph('m')], nucleus: [ph('eɪ')], coda: [ph('k'), ph('s')] }];
    applySilentE(clean, hyph, syllables, ['ai'], lookup, excluded, 100, () => 0);
    expect(clean[0]).toBe('maiks');
  });

  it('does not apply when coda sound is excluded', () => {
    const clean = ['maiw'];
    const hyph = ['maiw'];
    const syllables = [{ onset: [ph('m')], nucleus: [ph('eɪ')], coda: [ph('w')] }];
    applySilentE(clean, hyph, syllables, ['ai'], lookup, excluded, 100, () => 0);
    expect(clean[0]).toBe('maiw');
  });

  it('respects probability (rand >= threshold → no change)', () => {
    const clean = ['maik'];
    const hyph = ['maik'];
    const syllables = [{ onset: [ph('m')], nucleus: [ph('eɪ')], coda: [ph('k')] }];
    applySilentE(clean, hyph, syllables, ['ai'], lookup, excluded, 50, () => 0.99);
    expect(clean[0]).toBe('maik');
  });

  it('applies only to last syllable in multi-syllable words', () => {
    const clean = ['bai', 'seek'];
    const hyph = ['bai', '&shy;', 'seek'];
    const syllables = [
      { onset: [ph('b')], nucleus: [ph('eɪ')], coda: [] },
      { onset: [ph('s')], nucleus: [ph('i:')], coda: [ph('k')] },
    ];
    applySilentE(clean, hyph, syllables, ['ai', 'ee'], lookup, excluded, 100, () => 0);
    expect(clean[0]).toBe('bai'); // unchanged
    expect(clean[1]).toBe('seke'); // ee→e + e
  });

  it('does nothing when nucleus grapheme has no matching swap', () => {
    const clean = ['meyk'];
    const hyph = ['meyk'];
    const syllables = [{ onset: [ph('m')], nucleus: [ph('eɪ')], coda: [ph('k')] }];
    applySilentE(clean, hyph, syllables, ['ey'], lookup, excluded, 100, () => 0);
    expect(clean[0]).toBe('meyk'); // 'ey' not in swaps
  });
});

// ---------------------------------------------------------------------------
// Silent-e integration
// ---------------------------------------------------------------------------

describe('silent-e integration', () => {
  it('produces some silent-e words in 10k generated words', () => {
    const gen = createGenerator(englishConfig);
    // Pattern: word ends in consonant + 'e', with a single vowel letter before the consonant
    // e.g., "...aCe" where C is a consonant
    const silentEPattern = /[aeiou][bcdfghjklmnpqrstvwxyz]e$/;
    let silentECount = 0;
    const total = 10000;

    for (let i = 0; i < total; i++) {
      const word = gen.generateWord({ seed: i });
      if (silentEPattern.test(word.written.clean)) {
        silentECount++;
      }
    }

    // With 35% probability on eligible words, we should see at least some
    expect(silentECount).toBeGreaterThan(0);
    // Log for visibility
    console.log(`  Silent-e words: ${silentECount}/${total} (${(silentECount/total*100).toFixed(1)}%)`);
  });
});
