/** Stop (plosive) graphemes: /p/, /b/, /t/, /d/, /k/, /g/. */
import type { Grapheme, GraphemeCondition } from "../../types.js";
export const shortVowelsBeforeK = ["ɪ", "ɛ", "æ", "ʌ", "ɑ", "ɔ", "ʊ", "ə"];

/** Alternatives for a single /k/ coda followed by the next syllable's onset. */
function medialCodaSpellings(rightContext: string[], ckWeight: number, kWeight: number): Grapheme[] {
  const condition: GraphemeCondition = {
    rightContext,
    segmentPosition: ["medial"],
    syllableShape: { coda: 1 },
  };
  const codaK = { phoneme: "k", onset: 0, startWord: 0, midWord: 1, endWord: 0 };
  return [
    { ...codaK, form: "ck", frequency: ckWeight, positionScope: "syllable", startWord: 1,
      condition: { ...condition, leftContext: shortVowelsBeforeK, leftGraphemeLength: 1 } },
    { ...codaK, form: "k", frequency: kWeight,
      condition: { ...condition, leftContext: shortVowelsBeforeK, leftGraphemeLength: { min: 2 } } },
    { ...codaK, form: "k", frequency: kWeight,
      condition: { ...condition, notLeftContext: shortVowelsBeforeK } },
  ];
}

export const stopGraphemes: Grapheme[] = [
  // pig
  { phoneme: "p", 
    form: "p", 
    frequency: 50, 
    startWord: 1,
    midWord: 1,
    endWord: 1, 
  },

  // b boy
  { phoneme: "b", 
    form: "b", 
    frequency: 100,
    startWord: 1,
    midWord: 1,
    endWord: 1, },
  {
    phoneme: "b",
    form: "pb",
    frequency: 1,
    onset: 0,
    cluster: 0,
    startWord: 0,
    midWord: 1,
    endWord: 0,
    // Not after an e-final vowel (#470): magic-e cannot split ie + pb (liepbfilpina).
    condition: { notLeftGraphemeContext: ["e"] },
  },

  // t top
  { phoneme: "t", form: "t", frequency: 2500, startWord: 1,
    midWord: 1,
    endWord: 1, },
  
  { phoneme: "t", 
    form: "th", 
    frequency: 1, 
    coda: 0,
    cluster: 0,
    startWord: 0,
    midWord: 1,
    endWord: 1, },
  {
    phoneme: "t",
    form: "bt",
    frequency: 1,
    onset: 0,
    cluster: 0,
    startWord: 0,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "t",
    form: "ed",
    frequency: 2,
    onset: 0,
    startWord: 0,
    midWord: 0,
    endWord: 1,
  },

  // d dog
  { phoneme: "d", 
    form: "d", 
    frequency: 300,
    startWord: 1,
    midWord: 1,
    endWord: 1, },
  {
    phoneme: "d",
    form: "ed",
    frequency: 6,
    onset: 0,
    cluster: 300,
    startWord: 0,
    midWord: 0,
    endWord: 1,
  },

  // k: before front vowels (keep, kind)
  { phoneme: "k", 
    form: "k", 
    frequency: 5,
    startWord: 1,
    midWord: 1,
    endWord: 1,
    condition: { rightContext: ["c-soft-vowel"] },
  },
  // "mc" before front vowels (e.g., proper-name style forms) is rare but attested.
  // This prevents severe under-representation of "mc" bigrams without broad changes.
  // Where the vowel is then written e/i/y, the hard-c respell writes "mk" (#460).
  { phoneme: "k",
    form: "c",
    frequency: 120,
    startWord: 0,
    midWord: 150,
    endWord: 10,
    condition: { leftGraphemeContext: ["m"], rightContext: ["c-soft-vowel"] },
  },
  // k: after "n" — /ŋk/ writes as "nk" (bank, think, drink)
  { phoneme: "k",
    form: "k",
    frequency: 500,
    startWord: 0,
    midWord: 80,
    endWord: 80,
    condition: { leftGraphemeContext: ["n"] },
  },
  // k: word-final (speak, back)
  { phoneme: "k", 
    form: "k", 
    frequency: 2,
    startWord: 0,
    midWord: 0,
    endWord: 2,
    condition: { segmentPosition: ["final"] },
  },
  // c: before back vowels and consonants (cat, cold, cup, craft, become, record)
  // endWord kept low: bare word-final c is rare in English (music, panic)
  { phoneme: "k", 
    form: "c", 
    frequency: 300,
    cluster: 100,
    startWord: 100,
    midWord: 80,
    endWord: 10,
    condition: { notRightContext: ["c-soft-vowel"] },
  },
  {
    phoneme: "k",
    form: "ck",
    frequency: 80,
    onset: 0,
    // This preference belongs to the final rime, including /ks/ and /kt/.
    // Literal word-initial ck is excluded separately by onset and context.
    positionScope: "syllable",
    startWord: 1,
    midWord: 1,
    endWord: 150,
    condition: { leftContext: ["lax-vowel"], segmentPosition: ["medial", "final"] },
  },
  // The ordinary c entry weighs 24,000 medially. Before these nasals and
  // obstruents, ck/k are usual (hackney, blackmail, bleakness); c remains
  // possible (picnic, acme). Before l/r/t, c is much more common in CMU.
  ...medialCodaSpellings(["b", "d", "f", "g", "h", "m", "n", "p"], 240_000, 96_000),
  ...medialCodaSpellings(["l"], 20_000, 9_000),
  ...medialCodaSpellings(["r"], 5_000, 1_500),
  ...medialCodaSpellings(["t"], 1_000, 350),
  {
    phoneme: "k",
    form: "ch",
    frequency: 1,
    startWord: 1,
    midWord: 1,
    endWord: 1,
    condition: {
      rightContext: ["vowel", "r", "l"],
    },
  },
  {
    phoneme: "k",
    form: "lk",
    frequency: 4,
    onset: 0,
    startWord: 0,
    midWord: 1,
    endWord: 1,
    // Silent l follows a or o (walk, folk). After an e-final vowel magic-e
    // cannot split it either (#470: wielkar).
    condition: { notLeftGraphemeContext: ["e"] },
  },
  {
    phoneme: "k",
    form: "q",
    frequency: 1,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },

  // g: go
  { phoneme: "g", 
    form: "g", 
    frequency: 100,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "g",
    form: "gh",
    frequency: 2,
    coda: 0,
    cluster: 0,
    startWord: 1,
    midWord: 0,
    endWord: 0,
  },
  {
    phoneme: "g",
    form: "gu",
    frequency: 2,
    coda: 0,
    startWord: 1,
    midWord: 1,
    endWord: 0,
    condition: { rightContext: ["front-vowel"] },
  },
  {
    phoneme: "g",
    form: "gue",
    frequency: 1,
    onset: 0,
    startWord: 0,
    midWord: 1,
    endWord: 1,
  },

  // Triphthong graphemes removed — sounds decompose into diphthong + /ə/.
];
