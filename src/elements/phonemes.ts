export interface Phoneme {
  sound: string;
  type: "vowel" | "glide" | "liquid" | "nasal" | "fricative" | "affricate" | "plosive";
  complexity: number;
  // weightings of the phoneme appearing in the respective position
  nucleus?: number; 
  onset?: number;
  coda?: number;
}

export const sonority = {
  "vowel": 7,
  "glide": 6,
  "liquid": 5,
  "nasal": 4,
  "fricative": 3,
  "affricate": 2,
  "plosive": 1,
}

export const phonemes: Phoneme[] = [
  // Vowels
  // i: sheep
  { sound: "i", type: "vowel", complexity: 2, nucleus: 361 },
  // ɪ: sit
  { sound: "ɪ", type: "vowel", complexity: 1, nucleus: 632 },
  // e: red
  { sound: "e", type: "vowel", complexity: 2, nucleus: 100 },
  // ɛ: let
  { sound: "ɛ", type: "vowel", complexity: 2, nucleus: 286 },
  // æ: cat
  { sound: "æ", type: "vowel", complexity: 3, nucleus: 210 },
  // ɑ: father
  { sound: "ɑ", type: "vowel", complexity: 1, nucleus: 100 },
  // ɔ: ball
  { sound: "ɔ", type: "vowel", complexity: 2, nucleus: 100 },
  // o: hope
  { sound: "o", type: "vowel", complexity: 2, nucleus: 130 },
  // ʊ: book
  { sound: "ʊ", type: "vowel", complexity: 1, nucleus: 30 },
  // u: blue
  { sound: "u", type: "vowel", complexity: 2, nucleus: 193 },
  // ʌ: cup
  { sound: "ʌ", type: "vowel", complexity: 1, nucleus: 80 },
  // ə: the
  { sound: "ə", type: "vowel", complexity: 1, nucleus: 1150 },
  // aɪ: the
  { sound: "aɪ", type: "vowel", complexity: 3, nucleus: 50 },
  // aʊ: now
  { sound: "aʊ", type: "vowel", complexity: 3, nucleus: 30 },
  // oɪ: boy
  { sound: "ɔɪ", type: "vowel", complexity: 3, nucleus: 30 },
  // ɪə: coin
  { sound: "ɪə", type: "vowel", complexity: 3, nucleus: 10 },
  // eɪ: day
  { sound: "eɪ", type: "vowel", complexity: 3, nucleus: 50 },
  // ɑʊ: now
  { sound: "ɑʊ", type: "vowel", complexity: 3, nucleus: 50 },
  // ɜ: bed, said, execute
  { sound: "ɜ", type: "vowel", complexity: 2, nucleus: 140 },
  // ɚ: her, letter
  { sound: "ɚ", type: "vowel", complexity: 3, nucleus: 50 },

  // Glides
  { sound: "j", type: "glide", complexity: 1, onset: 40, coda: 20 },
  { sound: "w", type: "glide", complexity: 1, onset: 165, coda: 30 },

  // Liquids
  { sound: "l", type: "liquid", complexity: 2, onset: 200, coda: 200 },
  { sound: "r", type: "liquid", complexity: 3, onset: 500, coda: 100 },

  // Nasals
  { sound: "m", type: "nasal", complexity: 1, onset: 100, coda: 176 },
  { sound: "n", type: "nasal", complexity: 1, onset: 350, coda: 350 },
  { sound: "ŋ", type: "nasal", complexity: 2, onset: 0, coda: 70 },

  // Fricatives
  {
    sound: "f",
    type: "fricative",
    complexity: 2,
    onset: 100,
    coda: 35,
  },
  {
    sound: "v",
    type: "fricative",
    complexity: 2,
    onset: 150,
    coda: 50,
  },
  {
    sound: "θ",
    type: "fricative",
    complexity: 3,
    onset: 50,
    coda: 50,
  }, // as in "think"
  {
    sound: "ð",
    type: "fricative",
    complexity: 3,
    onset: 250,
    coda: 50,
  }, // as in "this"
  {
    sound: "s",
    type: "fricative",
    complexity: 2,
    onset: 400,
    coda: 175,
  }, // as in "see"
  {
    sound: "z",
    type: "fricative",
    complexity: 2,
    onset: 10,
    coda: 200,
  }, // as in "zebra"
  {
    sound: "ʃ",
    type: "fricative",
    complexity: 3,
    onset: 35,
    coda: 5,
  }, // as in "she"
  {
    sound: "ʒ",
    type: "fricative",
    complexity: 3,
    onset: 10,
    coda: 10,
  }, // as in "measure"
  {
    sound: "h",
    type: "fricative",
    complexity: 1,
    onset: 120,
    coda: 0,
  }, // as in "he"

  // Affricates
  {
    sound: "tʃ",
    type: "affricate",
    complexity: 3,
    onset: 40,
    coda: 30,
  },
  {
    sound: "dʒ",
    type: "affricate",
    complexity: 3,
    onset: 30,
    coda: 20,
  },

  // Plosives
  {
    sound: "p",
    type: "plosive",
    complexity: 1,
    onset: 165,
    coda: 50,
  },
  {
    sound: "b",
    type: "plosive",
    complexity: 1,
    onset: 160,
    coda: 20,
  },
  {
    sound: "t",
    type: "plosive",
    complexity: 1,
    onset: 350,
    coda: 350,
  }, // as in "top"
  {
    sound: "d",
    type: "plosive",
    complexity: 1,
    onset: 210,
    coda: 210,
  }, // as in "dog"
  {
    sound: "k",
    type: "plosive",
    complexity: 2,
    onset: 220,
    coda: 100,
  }, // as in "cat"
  {
    sound: "g",
    type: "plosive",
    complexity: 2,
    onset: 150,
    coda: 20,
  }, // as in "go"
];

const invalidGeneralClusters: RegExp[] = [
  /kf/,
  /fp/,
  /sʃ/,
  /t[θð]/,
  /[ŋjʒ]/,
  /mw/,
]

export const invalidBoundaryClusters: RegExp[] = [
  ...invalidGeneralClusters,
]

export const invalidOnsetClusters: RegExp[] = [
  ...invalidGeneralClusters,
  /^tʃ/,
  /^.?[ð].?/, // invalid in any position
  /^[wrlvznmjhʃ]/, //invalid in 1st position
  /^.[wzgdbθhvʃsf]/, // invalid in 2nd position
  /^(?!s)k|[^s]k/, // matches 'k' when it's not immediately after 's'
  /^[dtθð](?!r)./, // must be followed by r
  /^[kgpfb](?![rl])./, // must be followed by r or l
  /^sr/,
  /^sk(?![rlw])/,
  /^sp(?![rl])/,
  /^st(?![r])/,
];

export const invalidCodaClusters: RegExp[] = [
  ...invalidGeneralClusters,
  /.?[w].?$/, // invalid in any position
  /vsk$/,
  /.?[kθð](?![szd])$/,
  /lv(?![zd])$/,
  /[fʃ](?![zdt])/,
  /m[tv]/,
  /vg/,
  /lg/,
  /lsp/,
  /msp/,
  /np/,
  /g$/,
  /v$/,
  /.mp/,
  /b$/,
  /[jw]$/,
  /[szʒ]l$/,
  /[wðf]r$/,
  /[θðf]rl$/,
]
