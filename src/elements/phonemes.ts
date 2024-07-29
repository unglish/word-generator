export interface Phoneme {
  sound: string;
  type: "vowel" | "glide" | "liquid" | "nasal" | "fricative" | "affricate" | "plosive";
  // weightings of the phoneme appearing in the respective position
  nucleus?: number; 
  onset?: number;
  coda?: number;
  // weighting of appearing at the start or end of a word
  start?: number;
  end?: number;
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
  { sound: "i", type: "vowel", nucleus: 151 },
  // ɪ: sit
  { sound: "ɪ", type: "vowel", nucleus: 632 },
  // e: red
  { sound: "e", type: "vowel", nucleus: 100 },
  // ɛ: let
  { sound: "ɛ", type: "vowel", nucleus: 286 },
  // æ: cat
  { sound: "æ", type: "vowel", nucleus: 210 },
  // ɑ: father
  { sound: "ɑ", type: "vowel", nucleus: 100 },
  // ɔ: ball
  { sound: "ɔ", type: "vowel", nucleus: 100 },
  // o: hope
  { sound: "o", type: "vowel", nucleus: 130 },
  // ʊ: book
  { sound: "ʊ", type: "vowel", nucleus: 30 },
  // u: blue
  { sound: "u", type: "vowel", nucleus: 193 },
  // ʌ: cup
  { sound: "ʌ", type: "vowel", nucleus: 80 },
  // ə: the
  { sound: "ə", type: "vowel", nucleus: 1150 },
  // aɪ: the
  { sound: "aɪ", type: "vowel", nucleus: 50 },
  // aʊ: now
  { sound: "aʊ", type: "vowel", nucleus: 30 },
  // oɪ: boy
  { sound: "ɔɪ", type: "vowel", nucleus: 10 },
  // ɪə: coin
  { sound: "ɪə", type: "vowel", nucleus: 10 },
  // eɪ: day
  { sound: "eɪ", type: "vowel", nucleus: 50 },
  // ɑʊ: now
  { sound: "ɑʊ", type: "vowel", nucleus: 50 },
  // ɜ: bed, said, execute
  { sound: "ɜ", type: "vowel", nucleus: 140 },
  // ɚ: her, letter
  { sound: "ɚ", type: "vowel", nucleus: 50 },

  // Glides
  { sound: "j", type: "glide", onset: 10, coda: 20 },
  { sound: "w", type: "glide", onset: 120, coda: 10 },

  // Liquids
  { sound: "l", type: "liquid", onset: 200, coda: 200 },
  { sound: "r", type: "liquid", onset: 500, coda: 100 },

  // Nasals
  { sound: "m", type: "nasal", onset: 100, coda: 176 },
  { sound: "n", type: "nasal", onset: 350, coda: 350 },
  { sound: "ŋ", type: "nasal", onset: 0, coda: 70 },

  // Fricatives
  {
    sound: "f",
    type: "fricative",
    onset: 100,
    coda: 35,
  },
  {
    sound: "v",
    type: "fricative",
    onset: 80,
    coda: 20,
  },
  {
    sound: "θ",
    type: "fricative",
    onset: 50,
    coda: 50,
  }, // as in "think"
  {
    sound: "ð",
    type: "fricative",
    onset: 250,
    coda: 50,
  }, // as in "this"
  {
    sound: "s",
    type: "fricative",
    onset: 400,
    coda: 175,
  }, // as in "see"
  {
    sound: "z",
    type: "fricative",
    onset: 10,
    coda: 200,
  }, // as in "zebra"
  {
    sound: "ʃ",
    type: "fricative",
    onset: 35,
    coda: 5,
  }, // as in "she"
  {
    sound: "ʒ",
    type: "fricative",
    onset: 10,
    coda: 10,
  }, // as in "measure"
  {
    sound: "h",
    type: "fricative",
    onset: 120,
    coda: 0,
  }, // as in "he"

  // Affricates
  {
    sound: "tʃ",
    type: "affricate",
    onset: 40,
    coda: 30,
  },
  {
    sound: "dʒ",
    type: "affricate",
    onset: 30,
    coda: 20,
  },

  // Plosives
  {
    sound: "p",
    type: "plosive",
    onset: 165,
    coda: 50,
  },
  {
    sound: "b",
    type: "plosive",
    onset: 160,
    coda: 20,
  },
  {
    sound: "t",
    type: "plosive",
    onset: 350,
    coda: 350,
  }, // as in "top"
  {
    sound: "d",
    type: "plosive",
    onset: 210,
    coda: 210,
  }, // as in "dog"
  {
    sound: "k",
    type: "plosive",
    onset: 220,
    coda: 100,
  }, // as in "cat"
  {
    sound: "g",
    type: "plosive",
    onset: 150,
    coda: 20,
  }, // as in "go"
];

const invalidGeneralClusters: RegExp[] = [
  /kf/,
  /fp/,
  /sʃ/,
  /ʒs/,
  /(.)\1/,  // Matches any duplicated character
  /t[θð]/,
  /[ŋjʒ]/,
  /mw/,
  /dt/,
  /rɜ/,
  /ɜr/,
  /td/,
  /pb/,
  /ʃh/,
  /ɔɪw/,
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
