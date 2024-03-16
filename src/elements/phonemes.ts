export interface Phoneme {
  sound: string;
  type: string;
  sonority: number;
  complexity: number;
  nucleus?: number;
  onset?: number;
  coda?: number;
}

export const phonemes = [
  // Vowels
  { sound: "i", type: "vowel", sonority: 7, complexity: 1, nucleus: 7 },
  { sound: "ɪ", type: "vowel", sonority: 7, complexity: 1, nucleus: 6 },
  { sound: "e", type: "vowel", sonority: 7, complexity: 1, nucleus: 6 },
  { sound: "ɛ", type: "vowel", sonority: 7, complexity: 3, nucleus: 2 },
  { sound: "æ", type: "vowel", sonority: 7, complexity: 1, nucleus: 5 },
  { sound: "ɑ", type: "vowel", sonority: 7, complexity: 1, nucleus: 6 },
  { sound: "ɔ", type: "vowel", sonority: 7, complexity: 1, nucleus: 1 },
  { sound: "o", type: "vowel", sonority: 7, complexity: 1, nucleus: 6 },
  { sound: "ʊ", type: "vowel", sonority: 7, complexity: 1, nucleus: 4 },
  { sound: "u", type: "vowel", sonority: 7, complexity: 1, nucleus: 6 },
  { sound: "ʌ", type: "vowel", sonority: 7, complexity: 1, nucleus: 4 },
  { sound: "ə", type: "vowel", sonority: 7, complexity: 1, nucleus: 4 },
  { sound: "aɪ", type: "vowel", sonority: 7, complexity: 2, nucleus: 5 },
  { sound: "aʊ", type: "vowel", sonority: 7, complexity: 2, nucleus: 1 },
  { sound: "oɪ", type: "vowel", sonority: 7, complexity: 2, nucleus: 2 },
  { sound: "ɪə", type: "vowel", sonority: 7, complexity: 2, nucleus: 2 },
  { sound: "eɪ", type: "vowel", sonority: 7, complexity: 2, nucleus: 2 },
  { sound: "ɑʊ", type: "vowel", sonority: 7, complexity: 2, nucleus: 2 },
  { sound: "ɜ", type: "vowel", sonority: 7, complexity: 1, nucleus: 3 },
  { sound: "ɚ", type: "vowel", sonority: 7, complexity: 1, nucleus: 5 },

  // Glides
  { sound: "j", type: "glide", sonority: 6, complexity: 2, onset: 8, coda: 2 },
  { sound: "w", type: "glide", sonority: 6, complexity: 2, onset: 8, coda: 2 },

  // Liquids
  { sound: "l", type: "liquid", sonority: 5, complexity: 2, onset: 9, coda: 5 },
  { sound: "r", type: "liquid", sonority: 5, complexity: 2, onset: 9, coda: 5 },

  // Nasals
  { sound: "m", type: "nasal", sonority: 4, complexity: 1, onset: 7, coda: 8 },
  { sound: "n", type: "nasal", sonority: 4, complexity: 1, onset: 7, coda: 9 },
  { sound: "ŋ", type: "nasal", sonority: 4, complexity: 1, onset: 2, coda: 7 },

  // Fricatives
  {
    sound: "f",
    type: "fricative",
    sonority: 3,
    complexity: 1,
    onset: 6,
    coda: 4,
  },
  {
    sound: "v",
    type: "fricative",
    sonority: 3,
    complexity: 1,
    onset: 6,
    coda: 4,
  },
  {
    sound: "θ",
    type: "fricative",
    sonority: 3,
    complexity: 2,
    onset: 5,
    coda: 3,
  }, // as in "think"
  {
    sound: "ð",
    type: "fricative",
    sonority: 3,
    complexity: 1,
    onset: 5,
    coda: 3,
  }, // as in "this"
  {
    sound: "s",
    type: "fricative",
    sonority: 3,
    complexity: 1,
    onset: 8,
    coda: 6,
  }, // as in "see"
  {
    sound: "z",
    type: "fricative",
    sonority: 3,
    complexity: 2,
    onset: 3,
    coda: 6,
  }, // as in "zebra"
  {
    sound: "ʃ",
    type: "fricative",
    sonority: 3,
    complexity: 1,
    onset: 7,
    coda: 5,
  }, // as in "she"
  {
    sound: "ʒ",
    type: "fricative",
    sonority: 3,
    complexity: 1,
    onset: 4,
    coda: 4,
  }, // as in "measure"
  {
    sound: "h",
    type: "fricative",
    sonority: 3,
    complexity: 1,
    onset: 9,
    coda: 0,
  }, // as in "he"

  // Affricates
  {
    sound: "tʃ",
    type: "affricate",
    sonority: 2,
    complexity: 2,
    onset: 7,
    coda: 3,
  },
  {
    sound: "dʒ",
    type: "affricate",
    sonority: 2,
    complexity: 2,
    onset: 7,
    coda: 3,
  },

  // Plosives
  {
    sound: "p",
    type: "plosive",
    sonority: 1,
    complexity: 1,
    onset: 10,
    coda: 3,
  },
  {
    sound: "b",
    type: "plosive",
    sonority: 1,
    complexity: 1,
    onset: 10,
    coda: 3,
  },
  {
    sound: "t",
    type: "plosive",
    sonority: 1,
    complexity: 1,
    onset: 10,
    coda: 5,
  }, // as in "top"
  {
    sound: "d",
    type: "plosive",
    sonority: 1,
    complexity: 1,
    onset: 10,
    coda: 4,
  }, // as in "dog"
  {
    sound: "k",
    type: "plosive",
    sonority: 1,
    complexity: 1,
    onset: 10,
    coda: 4,
  }, // as in "cat"
  {
    sound: "g",
    type: "plosive",
    sonority: 1,
    complexity: 1,
    onset: 10,
    coda: 3,
  }, // as in "go"
];

export interface Cluster {
  sounds: string[];
  onset: number;
  coda: number;
}

export const clusters = [
  { sounds: ["s", "t"], onset: 1, coda: 1 },
  { sounds: ["s", "p"], onset: 1, coda: 1 },
  { sounds: ["s", "k"], onset: 1, coda: 1 },
  { sounds: ["p", "l"], onset: 1, coda: 0 },
  { sounds: ["b", "l"], onset: 1, coda: 0 },
  { sounds: ["k", "l"], onset: 1, coda: 0 },
  { sounds: ["g", "l"], onset: 1, coda: 0 },
  { sounds: ["p", "r"], onset: 1, coda: 0 },
  { sounds: ["b", "r"], onset: 1, coda: 0 },
  { sounds: ["t", "r"], onset: 1, coda: 0 },
  { sounds: ["d", "r"], onset: 1, coda: 0 },
  { sounds: ["k", "r"], onset: 1, coda: 0 },
  { sounds: ["g", "r"], onset: 1, coda: 0 },
  { sounds: ["f", "l"], onset: 1, coda: 0 },
  { sounds: ["f", "r"], onset: 1, coda: 0 },
  { sounds: ["θ", "r"], onset: 1, coda: 0 },
  { sounds: ["s", "l"], onset: 1, coda: 0 },
  { sounds: ["s", "w"], onset: 1, coda: 0 },
  { sounds: ["s", "m"], onset: 1, coda: 0 },
  { sounds: ["s", "n"], onset: 1, coda: 0 },
  { sounds: ["s", "k", "r"], onset: 1, coda: 0 },
  { sounds: ["s", "k", "w"], onset: 1, coda: 0 },
  { sounds: ["s", "p", "l"], onset: 1, coda: 0 },
  { sounds: ["s", "p", "r"], onset: 1, coda: 0 },
  { sounds: ["s", "t", "r"], onset: 1, coda: 0 },
  { sounds: ["k", "s", "t"], onset: 0, coda: 1 },
  { sounds: ["n", "ʃ", "t"], onset: 0, coda: 1 },
  { sounds: ["m", "p", "θ"], onset: 0, coda: 1 },
  { sounds: ["ŋ", "θ", "s"], onset: 0, coda: 1 },
  { sounds: ["n", "d", "z"], onset: 0, coda: 1 },
  { sounds: ["l", "d", "z"], onset: 0, coda: 1 },
  { sounds: ["r", "t", "s"], onset: 0, coda: 1 },
  { sounds: ["f", "t", "s"], onset: 0, coda: 1 },
  { sounds: ["p", "t", "s"], onset: 0, coda: 1 },
  { sounds: ["n", "s", "t"], onset: 0, coda: 1 },
  { sounds: ["r", "k", "s"], onset: 0, coda: 1 },
  { sounds: ["n", "k", "t"], onset: 0, coda: 1 },
  { sounds: ["n", "t"], onset: 0, coda: 1 },
  { sounds: ["n", "d"], onset: 0, coda: 1 },
  { sounds: ["ŋ", "k"], onset: 0, coda: 1 },
  { sounds: ["m", "p"], onset: 0, coda: 1 },
  { sounds: ["l", "t"], onset: 0, coda: 1 },
  { sounds: ["l", "d"], onset: 0, coda: 1 },
  { sounds: ["l", "f"], onset: 0, coda: 1 },
  { sounds: ["l", "θ"], onset: 0, coda: 1 },
  { sounds: ["r", "t"], onset: 0, coda: 1 },
  { sounds: ["r", "d"], onset: 0, coda: 1 },
  { sounds: ["r", "k"], onset: 0, coda: 1 },
  { sounds: ["r", "g"], onset: 0, coda: 1 },
  { sounds: ["r", "m"], onset: 0, coda: 1 },
  { sounds: ["r", "n"], onset: 0, coda: 1 },
];
