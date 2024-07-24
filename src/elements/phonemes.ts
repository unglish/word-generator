export interface Phoneme {
  sound: string;
  type: "vowel" | "consonant";
  sonority: number;
  complexity: number;
  // weightings of the phoneme appearing in the respective position
  nucleus?: number; 
  onset?: number;
  coda?: number;
}

export const phonemes = [
  // Vowels
  // i: sheep
  { sound: "i", type: "vowel", sonority: 7, complexity: 1, nucleus: 361 },
  // ɪ: sit
  { sound: "ɪ", type: "vowel", sonority: 7, complexity: 1, nucleus: 632 },
  // e: red
  { sound: "e", type: "vowel", sonority: 7, complexity: 1, nucleus: 100 },
  // ɛ: let
  { sound: "ɛ", type: "vowel", sonority: 7, complexity: 3, nucleus: 286 },
  // æ: cat
  { sound: "æ", type: "vowel", sonority: 7, complexity: 1, nucleus: 210 },
  // ɑ: father
  { sound: "ɑ", type: "vowel", sonority: 7, complexity: 1, nucleus: 100 },
  // ɔ: ball
  { sound: "ɔ", type: "vowel", sonority: 7, complexity: 1, nucleus: 100 },
  // o: hope
  { sound: "o", type: "vowel", sonority: 7, complexity: 1, nucleus: 130 },
  // ʊ: book
  { sound: "ʊ", type: "vowel", sonority: 7, complexity: 1, nucleus: 70 },
  // u: blue
  { sound: "u", type: "vowel", sonority: 7, complexity: 1, nucleus: 193 },
  // ʌ: cup
  { sound: "ʌ", type: "vowel", sonority: 7, complexity: 1, nucleus: 80 },
  // ə: the
  { sound: "ə", type: "vowel", sonority: 7, complexity: 1, nucleus: 1150 },
  // aɪ: the
  { sound: "aɪ", type: "vowel", sonority: 7, complexity: 2, nucleus: 50 },
  // aʊ: now
  { sound: "aʊ", type: "vowel", sonority: 7, complexity: 2, nucleus: 30 },
  // oɪ: boy
  { sound: "ɔɪ", type: "vowel", sonority: 7, complexity: 2, nucleus: 30 },
  // ɪə: coin
  { sound: "ɪə", type: "vowel", sonority: 7, complexity: 2, nucleus: 30 },
  // eɪ: day
  { sound: "eɪ", type: "vowel", sonority: 7, complexity: 2, nucleus: 50 },
  // ɑʊ: now
  { sound: "ɑʊ", type: "vowel", sonority: 7, complexity: 2, nucleus: 50 },
  // ɜ: bed, said, execute
  { sound: "ɜ", type: "vowel", sonority: 7, complexity: 1, nucleus: 140 },
  // ɚ: her, letter
  { sound: "ɚ", type: "vowel", sonority: 7, complexity: 1, nucleus: 50 },

  // Glides
  { sound: "j", type: "glide", sonority: 6, complexity: 2, onset: 40, coda: 20 },
  { sound: "w", type: "glide", sonority: 6, complexity: 2, onset: 165, coda: 30 },

  // Liquids
  { sound: "l", type: "liquid", sonority: 5, complexity: 2, onset: 200, coda: 200 },
  { sound: "r", type: "liquid", sonority: 5, complexity: 2, onset: 500, coda: 100 },

  // Nasals
  { sound: "m", type: "nasal", sonority: 4, complexity: 1, onset: 100, coda: 176 },
  { sound: "n", type: "nasal", sonority: 4, complexity: 1, onset: 350, coda: 350 },
  { sound: "ŋ", type: "nasal", sonority: 4, complexity: 1, onset: 10, coda: 70 },

  // Fricatives
  {
    sound: "f",
    type: "fricative",
    sonority: 3,
    complexity: 1,
    onset: 100,
    coda: 35,
  },
  {
    sound: "v",
    type: "fricative",
    sonority: 3,
    complexity: 1,
    onset: 150,
    coda: 50,
  },
  {
    sound: "θ",
    type: "fricative",
    sonority: 3,
    complexity: 2,
    onset: 50,
    coda: 50,
  }, // as in "think"
  {
    sound: "ð",
    type: "fricative",
    sonority: 3,
    complexity: 1,
    onset: 250,
    coda: 50,
  }, // as in "this"
  {
    sound: "s",
    type: "fricative",
    sonority: 3,
    complexity: 1,
    onset: 300,
    coda: 175,
  }, // as in "see"
  {
    sound: "z",
    type: "fricative",
    sonority: 3,
    complexity: 2,
    onset: 200,
    coda: 75,
  }, // as in "zebra"
  {
    sound: "ʃ",
    type: "fricative",
    sonority: 3,
    complexity: 1,
    onset: 35,
    coda: 5,
  }, // as in "she"
  {
    sound: "ʒ",
    type: "fricative",
    sonority: 3,
    complexity: 1,
    onset: 10,
    coda: 10,
  }, // as in "measure"
  {
    sound: "h",
    type: "fricative",
    sonority: 3,
    complexity: 1,
    onset: 120,
    coda: 0,
  }, // as in "he"

  // Affricates
  {
    sound: "tʃ",
    type: "affricate",
    sonority: 2,
    complexity: 2,
    onset: 40,
    coda: 30,
  },
  {
    sound: "dʒ",
    type: "affricate",
    sonority: 2,
    complexity: 2,
    onset: 30,
    coda: 20,
  },

  // Plosives
  {
    sound: "p",
    type: "plosive",
    sonority: 1,
    complexity: 1,
    onset: 165,
    coda: 50,
  },
  {
    sound: "b",
    type: "plosive",
    sonority: 1,
    complexity: 1,
    onset: 160,
    coda: 20,
  },
  {
    sound: "t",
    type: "plosive",
    sonority: 1,
    complexity: 1,
    onset: 350,
    coda: 350,
  }, // as in "top"
  {
    sound: "d",
    type: "plosive",
    sonority: 1,
    complexity: 1,
    onset: 210,
    coda: 210,
  }, // as in "dog"
  {
    sound: "k",
    type: "plosive",
    sonority: 1,
    complexity: 1,
    onset: 220,
    coda: 100,
  }, // as in "cat"
  {
    sound: "g",
    type: "plosive",
    sonority: 1,
    complexity: 1,
    onset: 150,
    coda: 20,
  }, // as in "go"
];

export interface Cluster {
  sounds: string[];
  onset: number;
  coda: number;
}

export const clusters = [
  { sounds: ["s", "t"], onset: 1434, coda: 726 },
  { sounds: ["s", "p"], onset: 548, coda: 120 },
  { sounds: ["s", "k"], onset: 84, coda: 75 },
  { sounds: ["p", "l"], onset: 759, coda: 0 },
  { sounds: ["b", "l"], onset: 253, coda: 0 },
  { sounds: ["k", "l"], onset: 126, coda: 0 },
  { sounds: ["g", "l"], onset: 168, coda: 0 },
  { sounds: ["p", "r"], onset: 126, coda: 0 },
  { sounds: ["b", "r"], onset: 295, coda: 0 },
  { sounds: ["t", "r"], onset: 1097, coda: 0 },
  { sounds: ["d", "r"], onset: 464, coda: 0 },
  { sounds: ["k", "r"], onset: 168, coda: 0 },
  { sounds: ["g", "r"], onset: 1678, coda: 0 },
  { sounds: ["f", "l"], onset: 379, coda: 0 },
  { sounds: ["f", "r"], onset: 421, coda: 0 },
  { sounds: ["θ", "r"], onset: 337, coda: 0 },
  { sounds: ["s", "l"], onset: 168, coda: 0 },
  { sounds: ["s", "w"], onset: 168, coda: 0 },
  { sounds: ["s", "m"], onset: 126, coda: 0 },
  { sounds: ["s", "n"], onset: 86, coda: 0 },
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
  { sounds: ["n", "t"], onset: 0, coda: 977 },
  { sounds: ["n", "d"], onset: 0, coda: 1142 },
  { sounds: ["ŋ", "k"], onset: 0, coda: 251 },
  { sounds: ["m", "p"], onset: 0, coda: 55 },
  { sounds: ["l", "t"], onset: 0, coda: 139 },
  { sounds: ["l", "d"], onset: 0, coda: 726 },
  { sounds: ["l", "f"], onset: 0, coda: 83 },
  { sounds: ["l", "θ"], onset: 0, coda: 251 },
  { sounds: ["r", "t"], onset: 0, coda: 126 },
  { sounds: ["r", "d"], onset: 0, coda: 126 },
  { sounds: ["r", "k"], onset: 0, coda: 126 },
  { sounds: ["r", "g"], onset: 0, coda: 126 },
  { sounds: ["r", "m"], onset: 0, coda: 126 },
  { sounds: ["r", "n"], onset: 0, coda: 126 },
];
