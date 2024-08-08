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
  { sound: "i:", type: "highVowel", tense: true, nucleus: 150, startWord: 10, midWord: 1, endWord: 1 }, // sheep
  { sound: "ɪ", type: "highVowel", tense: false, nucleus: 230, startWord: 1, midWord: 4, endWord: 0 }, // sit

  // Mid Vowels
  { sound: "e", type: "midVowel", tense: false, nucleus: 140, startWord: 8, midWord: 2, endWord: 0 }, // red
  { sound: "ɛ", type: "midVowel", tense: false, nucleus: 280, startWord: 8, midWord: 2, endWord: 0 }, // let
  { sound: "ə", type: "midVowel", tense: true, nucleus: 800, startWord: 4, midWord: 8, endWord: 0.5 }, // the
  { sound: "ɜ", type: "midVowel", tense: true, nucleus: 50, startWord: 4, midWord: 2, endWord: 2 }, // bed, said, execute
  { sound: "ɚ", type: "midVowel", tense: true, nucleus: 90, startWord: 0, midWord: 2, endWord: 2 }, // her, letter

  // Low Vowels
  { sound: "æ", type: "lowVowel", tense: false, nucleus: 220, startWord: 6, midWord: 6, endWord: 2 }, // apple, hat, map
  { sound: "ɑ", type: "lowVowel", tense: true, nucleus: 150, startWord: 6, midWord: 2, endWord: 2 }, // father
  { sound: "ɔ", type: "lowVowel", tense: true, nucleus: 130, startWord: 6, midWord: 2, endWord: 2 }, // ball
  { sound: "o", type: "lowVowel", tense: true, nucleus: 100, startWord: 6, midWord: 2, endWord: 2 }, // hope
  { sound: "ʊ", type: "lowVowel", tense: true, nucleus: 70, startWord: 4, midWord: 2, endWord: 2 }, // book
  { sound: "u", type: "lowVowel", tense: true, nucleus: 80, startWord: 8, midWord: 2, endWord: 6 }, // blue
  { sound: "ʌ", type: "lowVowel", tense: false, nucleus: 180, startWord: 4, midWord: 2, endWord: 1 }, // cup

  // Diphthongs (typically treated as mid or low vowels)
  { sound: "eɪ", type: "midVowel", tense: true, nucleus: 170, startWord: 6, midWord: 2, endWord: 6 }, // day, late, gate
  { sound: "ɪə", type: "midVowel", tense: true, nucleus: 30, startWord: 4, midWord: 2, endWord: 4 }, // dear, fear
  { sound: "eə", type: "midVowel", tense: true, nucleus: 20, startWord: 4, midWord: 2, endWord: 4 }, // fair, care
  { sound: "aɪ", type: "midVowel", tense: true, nucleus: 150, startWord: 6, midWord: 2, endWord: 6 }, // fly, time, rhyme
  { sound: "ʊə", type: "midVowel", tense: true, nucleus: 10, startWord: 6, midWord: 2, endWord: 6 }, // sure /ʃʊə/, cure /kjʊə/
  { sound: "əʊ", type: "midVowel", tense: true, nucleus: 140, startWord: 6, midWord: 2, endWord: 6 }, // globe, show, blow
  { sound: "ɔɪ", type: "midVowel", tense: true, nucleus: 20, startWord: 4, midWord: 2, endWord: 4 }, // boy, join, coin
  { sound: "aʊ", type: "midVowel", tense: true, nucleus: 60, startWord: 6, midWord: 1, endWord: 6 }, // cow (/kaʊ/) or how (/haʊ/)

  // Tripthongs
  { sound: "aɪə", type: "lowVowel", tense: true, nucleus: 80, startWord: 3, midWord: 1, endWord: 3 }, // fire, lire, tire
  { sound: "aʊə", type: "lowVowel", tense: true, nucleus: 60, startWord: 2, midWord: 1, endWord: 2 }, // hour, shower, power
  { sound: "eɪə", type: "midVowel", tense: true, nucleus: 50, startWord: 2, midWord: 1, endWord: 2 }, // player, layer
  { sound: "ɔɪə", type: "midVowel", tense: true, nucleus: 40, startWord: 2, midWord: 0, endWord: 2 }, // employer, royal, loyal
  { sound: "əʊə", type: "midVowel", tense: true, nucleus: 30, startWord: 1, midWord: 2, endWord: 2 }, // lower, mower

  // Glides
  { sound: "j", type: "glide", onset: 10, coda: 20, startWord: 6, midWord: 2, endWord: 2 }, // yes
  { sound: "w", type: "glide", onset: 120, coda: 10, startWord: 6, midWord: 2, endWord: 2 }, // wow

  // Liquids
  { sound: "l", type: "liquid", onset: 200, coda: 200, startWord: 8, midWord: 2, endWord: 8 }, // lid
  { sound: "r", type: "liquid", onset: 500, coda: 100, startWord: 8, midWord: 2, endWord: 8 }, // rank

  // Nasals
  { sound: "m", type: "nasal", onset: 100, coda: 176, startWord: 6, midWord: 2, endWord: 8 }, // mouse
  { sound: "n", type: "nasal", onset: 350, coda: 350, startWord: 8, midWord: 2, endWord: 10 }, // notice
  { sound: "ŋ", type: "nasal", onset: 0, coda: 70, startWord: 0, midWord: 2, endWord: 4 }, // bring

  // Voiceless Fricatives
  { sound: "f", type: "voicelessFricative", onset: 100, coda: 35, startWord: 6, midWord: 2, endWord: 4 },
  { sound: "θ", type: "voicelessFricative", onset: 50, coda: 50, startWord: 4, midWord: 2, endWord: 4 }, // think
  { sound: "s", type: "sibilant", onset: 400, coda: 175, startWord: 10, midWord: 2, endWord: 10 }, // see
  { sound: "ʃ", type: "sibilant", onset: 35, coda: 5, startWord: 4, midWord: 2, endWord: 2 }, // she
  { sound: "h", type: "voicelessFricative", onset: 120, coda: 0, startWord: 4, midWord: 2, endWord: 0 }, // he

  // Voiced Fricatives
  { sound: "v", type: "voicedFricative", onset: 85, coda: 20, startWord: 6, midWord: 2, endWord: 2 }, // victor
  { sound: "ð", type: "voicedFricative", onset: 250, coda: 50, startWord: 6, midWord: 2, endWord: 4 }, // this
  { sound: "z", type: "sibilant", onset: 5, coda: 50, startWord: 4, midWord: 4, endWord: 4 }, // zebra
  { sound: "ʒ", type: "sibilant", onset: 5, coda: 3, startWord: 0, midWord: 6, endWord: 0 }, // measure

  // Affricates
  { sound: "tʃ", type: "affricate", onset: 40, coda: 30, startWord: 4, midWord: 2, endWord: 2 }, // chat
  { sound: "dʒ", type: "affricate", onset: 30, coda: 20, startWord: 4, midWord: 2, endWord: 2 }, // judge

  // Voiceless Stops
  { sound: "p", type: "voicelessStop", onset: 165, coda: 50, startWord: 8, midWord: 2, endWord: 6 }, // pop
  { sound: "t", type: "voicelessStop", onset: 350, coda: 350, startWord: 10, midWord: 2, endWord: 10 }, // top
  { sound: "k", type: "voicelessStop", onset: 220, coda: 100, startWord: 8, midWord: 2, endWord: 6 }, // cat

  // Voiced Stops
  { sound: "b", type: "voicedStop", onset: 160, coda: 20, startWord: 6, midWord: 4, endWord: 4 }, // bob
  { sound: "d", type: "voicedStop", onset: 210, coda: 210, startWord: 8, midWord: 4, endWord: 8 }, // dog
  { sound: "g", type: "voicedStop", onset: 150, coda: 20, startWord: 6, midWord: 4, endWord: 4 }, // go
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
  /kf/,
  /t[θðdn]/,
  /mw/,
  /k[nb]/,
  /d[tp]/,
  /pb/,
  /ʒr/,
  /^.*.?[ðŋhʃ].?.*$/, // invalid in any position of a string at least 2 characters long
]

export const invalidOnsetClusters: RegExp[] = [
  ...invalidGeneralClusters,
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
  /m[tvg]/,
  /[vlstd]g/,
  /.*sp/,
  /tp/,
  /pk/,
  /np/,
  /nb/,
  /nzt/,
  /lnd/,
  /dʒt/,
  /.*.?v$/,
  /.*.?mp$/,
  /.*.?b$/,
  /.*?[jw]$/,
  /[szʒ]l$/,
  /[wðf]r$/,
  /[θðf]rl$/,
]
