import { Phoneme } from "../types.js";

export const sonorityToMannerOfArticulation = {
  "highVowel": 9,
  "midVowel": 8.5,
  "lowVowel": 8,
  "glide": 7,
  "liquid": 6,
  "nasal": 5,
  "lateralApproximant": 4.5,
  "sibilant": 4,
  "fricative": 3,
  "affricate": 2,
  "stop": 1,
};

export const sonorityToPlaceOfArticulation = {
  // Vowel places of articulation
  "front": 0.25,          // Vowel: Front
  "central": 0,           // Vowel: Central
  "back": -0.25,          // Vowel: Back

  // Consonants:
  "bilabial": -0.5,       // Lower sonority: Complete closure, less airflow
  "labiodental": -0.3,    // Slightly higher sonority than bilabials due to less constriction
  "dental": -0.2,         // Generally lower sonority, but slightly higher than labiodentals
  "alveolar": 0,          // Baseline sonority for consonants, balance between closure and openness
  "velar": 0.1,          // Higher than alveolar but lower than palatal
  "postalveolar": 0.2,   // Higher sonority due to slightly more open articulation
  "labial-velar": 0.2,   // Relatively high sonority due to the combination of articulations
  "palatal": 0.3,        // Even higher sonority, more resonant cavity
  "glottal": 0.5,        // H sounds
};

export const forwardnessToPlaceOfArticulation = {
  // Vowel places of articulation
  "front": 9,           // High forwardness due to tongue position towards the front of the mouth
  "central": 5,         // Intermediate forwardness as the tongue is centrally positioned
  "back": 2,            // Lower forwardness due to tongue retraction towards the back of the mouth

  // Consonants:
  "bilabial": 8,        // High forwardness as these are articulated with the lips at the front of the mouth
  "labiodental": 7,     // Slightly less forward than bilabial, but still high as it involves the lips and teeth
  "dental": 6,          // Intermediate forwardness, involving the tongue against the teeth
  "alveolar": 5,        // Similar forwardness to dental, involving the tongue near the front of the mouth
  "postalveolar": 4,    // Slightly less forward as it involves the area just behind the alveolar ridge
  "palatal": 3,         // Less forward due to the tongue's contact with the hard palate
  "labial-velar": 4,    // Complex articulation with a mix of forward (labial) and back (velar) elements
  "velar": 2,           // Low forwardness as it involves the back of the tongue against the soft palate
  "glottal": 1,         // Lowest forwardness, involving the glottis in the throat
};


export const phonemes: Phoneme[] = [
  // High Vowels
  { sound: "i:", mannerOfArticulation: "highVowel", tense: true, nucleus: 150, startWord: 3, midWord: 1, endWord: 4, voiced: true, placeOfArticulation: "front" }, // sheep
  { sound: "ɪ", mannerOfArticulation: "highVowel", tense: false, nucleus: 230, startWord: 3, midWord: 8, endWord: 0, voiced: true, placeOfArticulation: "front" }, // sit

  // Mid Vowels
  { sound: "e", mannerOfArticulation: "midVowel", tense: false, nucleus: 140, startWord: 8, midWord: 2, endWord: 0, voiced: true, placeOfArticulation: "front" }, // red
  { sound: "ɛ", mannerOfArticulation: "midVowel", tense: false, nucleus: 280, startWord: 8, midWord: 2, endWord: 0, voiced: true, placeOfArticulation: "front" }, // let
  { sound: "ə", mannerOfArticulation: "midVowel", tense: true, nucleus: 280, startWord: 4, midWord: 8, endWord: 1, voiced: true, placeOfArticulation: "central" }, // the
  { sound: "ɜ", mannerOfArticulation: "midVowel", tense: true, nucleus: 50, startWord: 4, midWord: 2, endWord: 0, voiced: true, placeOfArticulation: "central" }, // bed, said, execute
  { sound: "ɚ", mannerOfArticulation: "midVowel", tense: true, nucleus: 90, startWord: 1, midWord: 2, endWord: 5, voiced: true, placeOfArticulation: "central" }, // her, letter

  // Low Vowels
  { sound: "æ", mannerOfArticulation: "lowVowel", tense: false, nucleus: 220, startWord: 6, midWord: 6, endWord: 0, voiced: true, placeOfArticulation: "front" }, // apple, hat, map
  { sound: "ɑ", mannerOfArticulation: "lowVowel", tense: true, nucleus: 150, startWord: 6, midWord: 2, endWord: 0, voiced: true, placeOfArticulation: "back" }, // father
  { sound: "ɔ", mannerOfArticulation: "lowVowel", tense: true, nucleus: 130, startWord: 6, midWord: 2, endWord: 0, voiced: true, placeOfArticulation: "back" }, // ball
  { sound: "o", mannerOfArticulation: "lowVowel", tense: true, nucleus: 100, startWord: 6, midWord: 2, endWord: 2, voiced: true, placeOfArticulation: "back" }, // hope
  { sound: "ʊ", mannerOfArticulation: "highVowel", tense: true, nucleus: 70, startWord: 4, midWord: 2, endWord: 0, voiced: true, placeOfArticulation: "back" }, // book
  { sound: "u", mannerOfArticulation: "highVowel", tense: true, nucleus: 80, startWord: 8, midWord: 2, endWord: 2, voiced: true, placeOfArticulation: "back" }, // blue
  { sound: "ʌ", mannerOfArticulation: "midVowel", tense: false, nucleus: 220, startWord: 4, midWord: 2, endWord: 1, voiced: true, placeOfArticulation: "central" }, // cup

  // Diphthongs (typically treated as mid or low vowels)
  { sound: "eɪ", mannerOfArticulation: "midVowel", tense: true, nucleus: 170, startWord: 6, midWord: 2, endWord: 6, voiced: true, placeOfArticulation: "front" }, // day, late, gate
  { sound: "ɪə", mannerOfArticulation: "midVowel", tense: true, nucleus: 30, startWord: 4, midWord: 2, endWord: 4, voiced: true, placeOfArticulation: "central" }, // dear, fear
  { sound: "eə", mannerOfArticulation: "midVowel", tense: true, nucleus: 20, startWord: 4, midWord: 2, endWord: 0, voiced: true, placeOfArticulation: "central" }, // fair, care
  { sound: "aɪ", mannerOfArticulation: "midVowel", tense: true, nucleus: 150, startWord: 6, midWord: 2, endWord: 3, voiced: true, placeOfArticulation: "front" }, // fly, time, rhyme
  { sound: "ʊə", mannerOfArticulation: "midVowel", tense: true, nucleus: 10, startWord: 6, midWord: 2, endWord: 6, voiced: true, placeOfArticulation: "central" }, // sure /ʃʊə/, cure /kjʊə/
  { sound: "əʊ", mannerOfArticulation: "midVowel", tense: true, nucleus: 80, startWord: 1, midWord: 2, endWord: 6, voiced: true, placeOfArticulation: "back" }, // globe, show, blow
  { sound: "ɔɪ", mannerOfArticulation: "midVowel", tense: true, nucleus: 20, startWord: 4, midWord: 2, endWord: 4, voiced: true, placeOfArticulation: "front" }, // boy, join, coin
  { sound: "aʊ", mannerOfArticulation: "midVowel", tense: true, nucleus: 20, startWord: 1, midWord: 1, endWord: 6, voiced: true, placeOfArticulation: "back" }, // cow (/kaʊ/) or how (/haʊ/)

  // Triphthongs
  { sound: "aɪə", mannerOfArticulation: "lowVowel", tense: true, nucleus: 80, startWord: 1, midWord: 1, endWord: 6, voiced: true, placeOfArticulation: "central" }, // fire, lire, tire
  { sound: "aʊə", mannerOfArticulation: "lowVowel", tense: true, nucleus: 60, startWord: 1, midWord: 2, endWord: 6, voiced: true, placeOfArticulation: "central" }, // hour, shower, power
  { sound: "eɪə", mannerOfArticulation: "midVowel", tense: true, nucleus: 50, startWord: 0, midWord: 1, endWord: 6, voiced: true, placeOfArticulation: "central" }, // player, layer
  { sound: "ɔɪə", mannerOfArticulation: "midVowel", tense: true, nucleus: 40, startWord: 0, midWord: 2, endWord: 6, voiced: true, placeOfArticulation: "central" }, // employer, royal, loyal
  { sound: "əʊə", mannerOfArticulation: "midVowel", tense: true, nucleus: 30, startWord: 1, midWord: 2, endWord: 6, voiced: true, placeOfArticulation: "central" }, // lower, mower

  // Glides
  { sound: "j", mannerOfArticulation: "glide", onset: 10, coda: 20, startWord: 6, midWord: 2, endWord: 2, voiced: true, placeOfArticulation: "palatal" }, // yes
  { sound: "w", mannerOfArticulation: "glide", onset: 120, coda: 10, startWord: 6, midWord: 2, endWord: 2, voiced: true, placeOfArticulation: "labial-velar" }, // wow

  // Liquids
  { sound: "l", mannerOfArticulation: "liquid", onset: 200, coda: 200, startWord: 8, midWord: 5, endWord: 8, voiced: true, placeOfArticulation: "alveolar" }, // lid
  { sound: "r", mannerOfArticulation: "liquid", onset: 500, coda: 100, startWord: 8, midWord: 2, endWord: 8, voiced: true, placeOfArticulation: "postalveolar" }, // rank

  // Nasals
  { sound: "m", mannerOfArticulation: "nasal", onset: 100, coda: 176, startWord: 6, midWord: 2, endWord: 8, voiced: true, placeOfArticulation: "bilabial" }, // mouse
  { sound: "n", mannerOfArticulation: "nasal", onset: 350, coda: 350, startWord: 8, midWord: 2, endWord: 10, voiced: true, placeOfArticulation: "alveolar" }, // notice
  { sound: "ŋ", mannerOfArticulation: "nasal", onset: 0, coda: 200, startWord: 0, midWord: 2, endWord: 30, voiced: true, placeOfArticulation: "velar" }, // bring

  // Voiceless Fricatives
  { sound: "f", mannerOfArticulation: "fricative", onset: 100, coda: 35, startWord: 6, midWord: 2, endWord: 4, voiced: false, placeOfArticulation: "labiodental" }, // fish
  { sound: "θ", mannerOfArticulation: "fricative", onset: 50, coda: 50, startWord: 4, midWord: 2, endWord: 4, voiced: false, placeOfArticulation: "dental" }, // think
  { sound: "h", mannerOfArticulation: "fricative", onset: 180, coda: 0, startWord: 6, midWord: 2, endWord: 0, voiced: false, placeOfArticulation: "glottal" }, // he

  // Voiced Fricatives
  { sound: "v", mannerOfArticulation: "fricative", onset: 85, coda: 20, startWord: 6, midWord: 2, endWord: 2, voiced: true, placeOfArticulation: "labiodental" }, // victor
  { sound: "ð", mannerOfArticulation: "fricative", onset: 250, coda: 50, startWord: 6, midWord: 2, endWord: 4, voiced: true, placeOfArticulation: "dental" }, // this

  // Sibilants
  { sound: "z", mannerOfArticulation: "sibilant", onset: 5, coda: 50, startWord: 4, midWord: 4, endWord: 4, voiced: true, placeOfArticulation: "alveolar" }, // zebra
  { sound: "ʒ", mannerOfArticulation: "sibilant", onset: 5, coda: 3, startWord: 0, midWord: 6, endWord: 0, voiced: true, placeOfArticulation: "postalveolar" }, // measure
  { sound: "s", mannerOfArticulation: "sibilant", onset: 200, coda: 100, startWord: 10, midWord: 2, endWord: 10, voiced: false, placeOfArticulation: "alveolar" }, // see
  { sound: "ʃ", mannerOfArticulation: "sibilant", onset: 35, coda: 80, startWord: 4, midWord: 1, endWord: 5, voiced: false, placeOfArticulation: "postalveolar" }, // she

  // Affricates
  { sound: "tʃ", voiced: false, placeOfArticulation: "postalveolar", mannerOfArticulation: "affricate", onset: 40, coda: 8990, startWord: 4, midWord: 2, endWord: 2 }, // chat
  { sound: "dʒ", voiced: true, placeOfArticulation: "postalveolar", mannerOfArticulation: "affricate", onset: 30, coda: 20, startWord: 4, midWord: 2, endWord: 2 }, // judge

  // Voiceless Stops
  { sound: "p", voiced: false, placeOfArticulation: "bilabial", mannerOfArticulation: "stop", onset: 165, coda: 50, startWord: 8, midWord: 10, endWord: 6 }, // pop
  { sound: "t", voiced: false, placeOfArticulation: "alveolar", mannerOfArticulation: "stop", onset: 350, coda: 350, startWord: 10, midWord: 10, endWord: 10 }, // top
  { sound: "k", voiced: false, placeOfArticulation: "velar", mannerOfArticulation: "stop", onset: 320, coda: 100, startWord: 14, midWord: 10, endWord: 6 }, // cat

  // Voiced Stops
  { sound: "b", voiced: true, placeOfArticulation: "bilabial", mannerOfArticulation: "stop", onset: 160, coda: 100, startWord: 6, midWord: 4, endWord: 4 }, // bob
  { sound: "d", voiced: true, placeOfArticulation: "alveolar", mannerOfArticulation: "stop", onset: 210, coda: 210, startWord: 8, midWord: 4, endWord: 8 }, // dog
  { sound: "g", voiced: true, placeOfArticulation: "velar", mannerOfArticulation: "stop", onset: 150, coda: 100, startWord: 6, midWord: 4, endWord: 4 }, // go
];

export const phonemeMaps = {
  onset: new Map<string, Phoneme[]>(),
  nucleus: new Map<string, Phoneme[]>(),
  coda: new Map<string, Phoneme[]>()
};

for (const position of ['onset', 'nucleus', 'coda'] as const) {
  for (const phoneme of phonemes) {
    if (phoneme[position] !== undefined && phoneme[position] > 0) {
      if (!phonemeMaps[position].has(phoneme.sound)) {
        phonemeMaps[position].set(phoneme.sound, []);
      }
      phonemeMaps[position].get(phoneme.sound)!.push(phoneme);
    }
  }
}

// Pre-compute sonority levels
export const sonorityLevels = new Map(
  phonemes.map(p => [
    p,
    sonorityToMannerOfArticulation[p.mannerOfArticulation] +
    (sonorityToPlaceOfArticulation[p.placeOfArticulation] || 0) +
    (p.voiced ? 0.5 : 0) +
    (p.tense ? 0.25 : 0)
  ])
);

export const invalidBoundaryClusters: RegExp[] = [
  /rɜ/,
  /ɜr/,
  /ʃh/,
  /sʃ/,
  /ʒs/,
]

const invalidGeneralClusters: RegExp[] = [
  ...invalidBoundaryClusters,
  /fn/,
  /t[ðn]/,
  /[θð]n/,
  /mw/,
  /k[nbf]/,
  /d[tpnmg]/,
  /pb/,
  /[ʒl]r/,
  /^.*.?[ðŋhʃ].?.*$/, // invalid in any position of a string at least 2 characters long
]

export const invalidOnsetClusters: RegExp[] = [
  ...invalidGeneralClusters,
  /^[wrlvznmjhʃ].{1,2}/, //invalid in 1st position when followed by 1-2 characters
  /^.[wzgdbθhvʃsf]/, // invalid in 2nd position
  /[^s]k/, // matches 'k' when it's not immediately preceded by 's'
  /t[θd]/,
  /dl/,
  /dʒ./,
  /pn/,
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
  /t[pb]/,
  /pk/,
  /n[bmp]/,
  /td/,
  /nzt/,
  /lnd/,
  /dʒt/,
  /sn/,
  /.*.?v$/,
  /.*.?mp$/,
  /.*.?b$/,
  /.*?[jw]$/,
  /[szʒ]l$/,
  /[wðf]r$/,
  /[θðf]rl$/,
]
