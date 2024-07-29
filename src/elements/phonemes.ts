import { Phoneme } from "../types.js";

export const sonority = {
  "highVowel": 7,
  "midVowel": 6,
  "lowVowel": 5,
  "glide": 4.5,
  "liquid": 4,
  "nasal": 3.5,
  "sibilant": 3.2,      // Higher than other fricatives due to prominence
  "voicedFricative": 3,
  "voicelessFricative": 2.5,
  "affricate": 2,
  "voicedStop": 1.5,
  "voicelessStop": 1,
}

export const phonemes: Phoneme[] = [
  // High Vowels
  { sound: "i", type: "highVowel", nucleus: 151, startWord: 5, midWord: 1, endWord: 2 }, // sheep
  { sound: "ɪ", type: "highVowel", nucleus: 632, startWord: 5, midWord: 1, endWord: 0 }, // sit

  // Mid Vowels
  { sound: "e", type: "midVowel", nucleus: 100, startWord: 4, midWord: 1, endWord: 0 }, // red
  { sound: "ɛ", type: "midVowel", nucleus: 286, startWord: 4, midWord: 1, endWord: 0 }, // let
  { sound: "ə", type: "midVowel", nucleus: 1150, startWord: 5, midWord: 1, endWord: 1 }, // the
  { sound: "ɜ", type: "midVowel", nucleus: 140, startWord: 2, midWord: 1, endWord: 1 }, // bed, said, execute
  { sound: "ɚ", type: "midVowel", nucleus: 50, startWord: 1, midWord: 1, endWord: 1 }, // her, letter

  // Low Vowels
  { sound: "æ", type: "lowVowel", nucleus: 210, startWord: 3, midWord: 1, endWord: 3 }, // apple, hat, map
  { sound: "ɑ", type: "lowVowel", nucleus: 100, startWord: 3, midWord: 1, endWord: 1 }, // father
  { sound: "ɔ", type: "lowVowel", nucleus: 100, startWord: 3, midWord: 1, endWord: 1 }, // ball
  { sound: "o", type: "lowVowel", nucleus: 130, startWord: 3, midWord: 1, endWord: 1 }, // hope
  { sound: "ʊ", type: "lowVowel", nucleus: 30, startWord: 2, midWord: 1, endWord: 1 }, // book
  { sound: "u", type: "lowVowel", nucleus: 193, startWord: 4, midWord: 1, endWord: 3 }, // blue
  { sound: "ʌ", type: "lowVowel", nucleus: 80, startWord: 2, midWord: 1, endWord: 0 }, // cup

  // Diphthongs (typically treated as mid or low vowels)
  { sound: "aɪ", type: "midVowel", nucleus: 50, startWord: 3, midWord: 1, endWord: 3 }, // fly
  { sound: "aʊ", type: "midVowel", nucleus: 30, startWord: 3, midWord: 1, endWord: 3 }, // house, down, about
  { sound: "ɔɪ", type: "midVowel", nucleus: 10, startWord: 2, midWord: 1, endWord: 2 }, // boy
  { sound: "ɪə", type: "midVowel", nucleus: 10, startWord: 2, midWord: 1, endWord: 2 }, // coin
  { sound: "eɪ", type: "midVowel", nucleus: 50, startWord: 3, midWord: 1, endWord: 3 }, // day
  { sound: "ɑʊ", type: "midVowel", nucleus: 50, startWord: 3, midWord: 1, endWord: 3 }, // blow

  // Glides
  { sound: "j", type: "glide", onset: 10, coda: 20, startWord: 3, midWord: 1, endWord: 1 }, // yes
  { sound: "w", type: "glide", onset: 120, coda: 10, startWord: 3, midWord: 1, endWord: 1 }, // wow

  // Liquids
  { sound: "l", type: "liquid", onset: 200, coda: 200, startWord: 4, midWord: 1, endWord: 4 }, // lid
  { sound: "r", type: "liquid", onset: 500, coda: 100, startWord: 4, midWord: 1, endWord: 4 }, // rank

  // Nasals
  { sound: "m", type: "nasal", onset: 100, coda: 176, startWord: 3, midWord: 1, endWord: 4 }, // mouse
  { sound: "n", type: "nasal", onset: 350, coda: 350, startWord: 4, midWord: 1, endWord: 5 }, // notice
  { sound: "ŋ", type: "nasal", onset: 0, coda: 70, startWord: 0, midWord: 1, endWord: 2 }, // bring

  // Voiceless Fricatives
  { sound: "f", type: "voicelessFricative", onset: 100, coda: 35, startWord: 3, midWord: 1, endWord: 2 },
  { sound: "θ", type: "voicelessFricative", onset: 50, coda: 50, startWord: 2, midWord: 1, endWord: 2 }, // think
  { sound: "s", type: "sibilant", onset: 400, coda: 175, startWord: 5, midWord: 1, endWord: 5 }, // see
  { sound: "ʃ", type: "sibilant", onset: 35, coda: 5, startWord: 2, midWord: 1, endWord: 1 }, // she
  { sound: "h", type: "voicelessFricative", onset: 120, coda: 0, startWord: 4, midWord: 1, endWord: 0 }, // he

  // Voiced Fricatives
  { sound: "v", type: "voicedFricative", onset: 80, coda: 20, startWord: 3, midWord: 1, endWord: 1 }, // victor
  { sound: "ð", type: "voicedFricative", onset: 250, coda: 50, startWord: 3, midWord: 1, endWord: 2 }, // this
  { sound: "z", type: "sibilant", onset: 10, coda: 200, startWord: 2, midWord: 1, endWord: 4 }, // zebra
  { sound: "ʒ", type: "sibilant", onset: 10, coda: 10, startWord: 1, midWord: 1, endWord: 1 }, // measure

  // Affricates
  { sound: "tʃ", type: "affricate", onset: 40, coda: 30, startWord: 2, midWord: 1, endWord: 1 }, // chat
  { sound: "dʒ", type: "affricate", onset: 30, coda: 20, startWord: 2, midWord: 1, endWord: 1 }, // judge

  // Voiceless Stops
  { sound: "p", type: "voicelessStop", onset: 165, coda: 50, startWord: 4, midWord: 1, endWord: 3 }, // pop
  { sound: "t", type: "voicelessStop", onset: 350, coda: 350, startWord: 5, midWord: 1, endWord: 5 }, // top
  { sound: "k", type: "voicelessStop", onset: 220, coda: 100, startWord: 4, midWord: 1, endWord: 3 }, // cat

  // Voiced Stops
  { sound: "b", type: "voicedStop", onset: 160, coda: 20, startWord: 3, midWord: 1, endWord: 2 }, // bob
  { sound: "d", type: "voicedStop", onset: 210, coda: 210, startWord: 4, midWord: 1, endWord: 4 }, // dog
  { sound: "g", type: "voicedStop", onset: 150, coda: 20, startWord: 3, midWord: 1, endWord: 2 }, // go
];


export const invalidBoundaryClusters: RegExp[] = [
  /rɜ/,
  /ɜr/,
  /ʃh/,
  /sʃ/,
  /ʒs/,
]

const invalidGeneralClusters: RegExp[] = [
  ...invalidBoundaryClusters,
  /t[θð]/,
  /mw/,
  /dt/,
  /td/,
  /pb/,
]

export const invalidOnsetClusters: RegExp[] = [
  ...invalidGeneralClusters,
  /^.*.?[ðŋ].?.*$/, // invalid in any position of a string at least 2 characters long
  /^[wrlvznmjhʃ].{1,2}/, //invalid in 1st position when followed by 1-2 characters
  /^.[wzgdbθhvʃsf]/, // invalid in 2nd position
  /[^s]k/, // matches 'k' when it's not immediately preceded by 's'
  /^[dtθð](?!r)./, // must be followed by r
  /^[kgpfb](?![rl])./, // must be followed by r or l
  /^sr/,
];

export const invalidCodaClusters: RegExp[] = [
  ...invalidGeneralClusters,
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
  /.*.?g$/,
  /.*.?v$/,
  /.*.?mp$/,
  /.*.?b$/,
  /.*?[jw]$/,
  /[szʒ]l$/,
  /[wðf]r$/,
  /[θðf]rl$/,
]
