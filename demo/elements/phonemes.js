import { VOICED_BONUS, TENSE_BONUS } from "../config/weights.js";
export const sonorityToMannerOfArticulation = {
    "highVowel": 9,
    "midVowel": 8.5,
    "lowVowel": 8,
    "glide": 7,
    "liquid": 6,
    "nasal": 5,
    "lateralApproximant": 6,
    "sibilant": 4,
    "fricative": 3,
    "affricate": 2,
    "stop": 1,
};
export const sonorityToPlaceOfArticulation = {
    // Vowel places of articulation
    "front": 0.25,
    "central": 0,
    "back": -0.25,
    // Consonants:
    "bilabial": -0.5,
    "labiodental": -0.3,
    "dental": -0.2,
    "alveolar": 0,
    "velar": 0.1,
    "postalveolar": 0.2,
    "labial-velar": 0.2,
    "palatal": 0.3,
    "glottal": 0.5, // H sounds
};
export const forwardnessToPlaceOfArticulation = {
    // Vowel places of articulation
    "front": 9,
    "central": 5,
    "back": 2,
    // Consonants:
    "bilabial": 8,
    "labiodental": 7,
    "dental": 6,
    "alveolar": 5,
    "postalveolar": 4,
    "palatal": 3,
    "labial-velar": 4,
    "velar": 2,
    "glottal": 1, // Lowest forwardness, involving the glottis in the throat
};
export const phonemes = [
    // High Vowels
    { sound: "i:", mannerOfArticulation: "highVowel", tense: true, nucleus: 150, startWord: 3, midWord: 1, endWord: 4, voiced: true, placeOfArticulation: "front" },
    { sound: "ɪ", mannerOfArticulation: "highVowel", tense: false, nucleus: 230, startWord: 3, midWord: 8, endWord: 1, voiced: true, placeOfArticulation: "front" },
    // Mid Vowels
    { sound: "e", mannerOfArticulation: "midVowel", tense: false, nucleus: 140, startWord: 8, midWord: 2, endWord: 1, voiced: true, placeOfArticulation: "front" },
    { sound: "ɛ", mannerOfArticulation: "midVowel", tense: false, nucleus: 280, startWord: 8, midWord: 2, endWord: 1, voiced: true, placeOfArticulation: "front" },
    { sound: "ə", mannerOfArticulation: "midVowel", tense: false, nucleus: 280, startWord: 4, midWord: 8, endWord: 1, voiced: true, placeOfArticulation: "central" },
    { sound: "ɜ", mannerOfArticulation: "midVowel", tense: false, nucleus: 50, startWord: 4, midWord: 2, endWord: 1, voiced: true, placeOfArticulation: "central" },
    { sound: "ɚ", mannerOfArticulation: "midVowel", tense: false, nucleus: 90, startWord: 1, midWord: 2, endWord: 5, voiced: true, placeOfArticulation: "central" },
    // Low Vowels
    { sound: "æ", mannerOfArticulation: "lowVowel", tense: false, nucleus: 220, startWord: 8, midWord: 6, endWord: 1, voiced: true, placeOfArticulation: "front" },
    { sound: "ɑ", mannerOfArticulation: "lowVowel", tense: true, nucleus: 150, startWord: 6, midWord: 2, endWord: 1, voiced: true, placeOfArticulation: "back" },
    { sound: "ɔ", mannerOfArticulation: "lowVowel", tense: true, nucleus: 180, startWord: 6, midWord: 2, endWord: 1, voiced: true, placeOfArticulation: "back" },
    { sound: "o", mannerOfArticulation: "lowVowel", tense: true, nucleus: 100, startWord: 6, midWord: 2, endWord: 2, voiced: true, placeOfArticulation: "back" },
    { sound: "ʊ", mannerOfArticulation: "highVowel", tense: true, nucleus: 70, startWord: 4, midWord: 2, endWord: 0, voiced: true, placeOfArticulation: "back" },
    { sound: "u", mannerOfArticulation: "highVowel", tense: true, nucleus: 80, startWord: 8, midWord: 2, endWord: 2, voiced: true, placeOfArticulation: "back" },
    { sound: "ʌ", mannerOfArticulation: "midVowel", tense: false, nucleus: 220, startWord: 4, midWord: 2, endWord: 1, voiced: true, placeOfArticulation: "central" },
    // Diphthongs (typically treated as mid or low vowels)
    { sound: "eɪ", mannerOfArticulation: "midVowel", tense: true, nucleus: 170, startWord: 6, midWord: 2, endWord: 6, voiced: true, placeOfArticulation: "front" },
    { sound: "ɪə", mannerOfArticulation: "midVowel", tense: true, nucleus: 30, startWord: 4, midWord: 2, endWord: 4, voiced: true, placeOfArticulation: "central" },
    { sound: "eə", mannerOfArticulation: "midVowel", tense: true, nucleus: 20, startWord: 4, midWord: 2, endWord: 0, voiced: true, placeOfArticulation: "central" },
    { sound: "aɪ", mannerOfArticulation: "midVowel", tense: true, nucleus: 150, startWord: 6, midWord: 2, endWord: 3, voiced: true, placeOfArticulation: "front" },
    { sound: "ʊə", mannerOfArticulation: "midVowel", tense: true, nucleus: 10, startWord: 6, midWord: 2, endWord: 6, voiced: true, placeOfArticulation: "central" },
    { sound: "əʊ", mannerOfArticulation: "midVowel", tense: true, nucleus: 80, startWord: 1, midWord: 2, endWord: 6, voiced: true, placeOfArticulation: "back" },
    { sound: "ɔɪ", mannerOfArticulation: "midVowel", tense: true, nucleus: 20, startWord: 4, midWord: 2, endWord: 4, voiced: true, placeOfArticulation: "front" },
    { sound: "aʊ", mannerOfArticulation: "midVowel", tense: true, nucleus: 20, startWord: 1, midWord: 1, endWord: 6, voiced: true, placeOfArticulation: "back" },
    // Triphthongs
    { sound: "aɪə", mannerOfArticulation: "lowVowel", tense: true, nucleus: 8, startWord: 1, midWord: 1, endWord: 6, voiced: true, placeOfArticulation: "central" },
    { sound: "aʊə", mannerOfArticulation: "lowVowel", tense: true, nucleus: 5, startWord: 1, midWord: 2, endWord: 6, voiced: true, placeOfArticulation: "central" },
    { sound: "eɪə", mannerOfArticulation: "midVowel", tense: true, nucleus: 4, startWord: 0, midWord: 1, endWord: 6, voiced: true, placeOfArticulation: "central" },
    { sound: "ɔɪə", mannerOfArticulation: "midVowel", tense: true, nucleus: 3, startWord: 0, midWord: 2, endWord: 6, voiced: true, placeOfArticulation: "central" },
    { sound: "əʊə", mannerOfArticulation: "midVowel", tense: true, nucleus: 3, startWord: 1, midWord: 2, endWord: 6, voiced: true, placeOfArticulation: "central" },
    // Glides
    { sound: "j", mannerOfArticulation: "glide", onset: 10, coda: 20, startWord: 6, midWord: 2, endWord: 2, voiced: true, placeOfArticulation: "palatal" },
    { sound: "w", mannerOfArticulation: "glide", onset: 120, coda: 10, startWord: 10, midWord: 2, endWord: 2, voiced: true, placeOfArticulation: "labial-velar" },
    // Liquids
    { sound: "l", mannerOfArticulation: "liquid", onset: 200, coda: 200, startWord: 8, midWord: 5, endWord: 8, voiced: true, placeOfArticulation: "alveolar" },
    { sound: "r", mannerOfArticulation: "liquid", onset: 500, coda: 100, startWord: 8, midWord: 2, endWord: 8, voiced: true, placeOfArticulation: "postalveolar" },
    // Nasals
    { sound: "m", mannerOfArticulation: "nasal", onset: 100, coda: 176, startWord: 6, midWord: 2, endWord: 8, voiced: true, placeOfArticulation: "bilabial" },
    { sound: "n", mannerOfArticulation: "nasal", onset: 350, coda: 350, startWord: 8, midWord: 2, endWord: 10, voiced: true, placeOfArticulation: "alveolar" },
    { sound: "ŋ", mannerOfArticulation: "nasal", onset: 0, coda: 40, startWord: 0, midWord: 2, endWord: 30, voiced: true, placeOfArticulation: "velar" },
    // Voiceless Fricatives
    { sound: "f", mannerOfArticulation: "fricative", onset: 100, coda: 100, startWord: 6, midWord: 2, endWord: 4, voiced: false, placeOfArticulation: "labiodental" },
    { sound: "θ", mannerOfArticulation: "fricative", onset: 50, coda: 50, startWord: 4, midWord: 2, endWord: 4, voiced: false, placeOfArticulation: "dental" },
    { sound: "h", mannerOfArticulation: "fricative", onset: 180, coda: 0, startWord: 10, midWord: 2, endWord: 0, voiced: false, placeOfArticulation: "glottal" },
    // Voiced Fricatives
    { sound: "v", mannerOfArticulation: "fricative", onset: 250, coda: 20, startWord: 6, midWord: 2, endWord: 8, voiced: true, placeOfArticulation: "labiodental" },
    { sound: "ð", mannerOfArticulation: "fricative", onset: 250, coda: 50, startWord: 6, midWord: 2, endWord: 4, voiced: true, placeOfArticulation: "dental" },
    // Sibilants
    { sound: "z", mannerOfArticulation: "sibilant", onset: 5, coda: 50, startWord: 4, midWord: 4, endWord: 4, voiced: true, placeOfArticulation: "alveolar" },
    { sound: "ʒ", mannerOfArticulation: "sibilant", onset: 5, coda: 3, startWord: 0, midWord: 6, endWord: 0, voiced: true, placeOfArticulation: "postalveolar" },
    { sound: "s", mannerOfArticulation: "sibilant", onset: 200, coda: 100, startWord: 10, midWord: 2, endWord: 10, voiced: false, placeOfArticulation: "alveolar" },
    { sound: "ʃ", mannerOfArticulation: "sibilant", onset: 35, coda: 80, startWord: 4, midWord: 1, endWord: 5, voiced: false, placeOfArticulation: "postalveolar" },
    // Affricates
    { sound: "tʃ", voiced: false, placeOfArticulation: "postalveolar", mannerOfArticulation: "affricate", onset: 40, coda: 40, startWord: 4, midWord: 2, endWord: 2 },
    { sound: "dʒ", voiced: true, placeOfArticulation: "postalveolar", mannerOfArticulation: "affricate", onset: 30, coda: 20, startWord: 4, midWord: 2, endWord: 2 },
    // Voiceless Stops
    { sound: "p", voiced: false, placeOfArticulation: "bilabial", mannerOfArticulation: "stop", onset: 165, coda: 50, startWord: 8, midWord: 10, endWord: 6 },
    { sound: "t", voiced: false, placeOfArticulation: "alveolar", mannerOfArticulation: "stop", onset: 350, coda: 350, startWord: 10, midWord: 10, endWord: 10 },
    { sound: "k", voiced: false, placeOfArticulation: "velar", mannerOfArticulation: "stop", onset: 320, coda: 100, startWord: 14, midWord: 10, endWord: 10 },
    // Voiced Stops
    { sound: "b", voiced: true, placeOfArticulation: "bilabial", mannerOfArticulation: "stop", onset: 210, coda: 100, startWord: 8, midWord: 4, endWord: 4 },
    { sound: "d", voiced: true, placeOfArticulation: "alveolar", mannerOfArticulation: "stop", onset: 210, coda: 210, startWord: 8, midWord: 4, endWord: 8 },
    { sound: "g", voiced: true, placeOfArticulation: "velar", mannerOfArticulation: "stop", onset: 50, coda: 100, startWord: 6, midWord: 4, endWord: 4 }, // go
];
export const phonemeMaps = {
    onset: new Map(),
    nucleus: new Map(),
    coda: new Map()
};
for (const position of ['onset', 'nucleus', 'coda']) {
    for (const phoneme of phonemes) {
        // @ts-ignore
        if (phoneme[position] !== undefined && phoneme[position] > 0) {
            if (!phonemeMaps[position].has(phoneme.sound)) {
                phonemeMaps[position].set(phoneme.sound, []);
            }
            phonemeMaps[position].get(phoneme.sound).push(phoneme);
        }
    }
}
// Pre-compute sonority levels
export const sonorityLevels = new Map(phonemes.map(p => [
    p,
    sonorityToMannerOfArticulation[p.mannerOfArticulation] +
        (sonorityToPlaceOfArticulation[p.placeOfArticulation] ?? 0) +
        (p.voiced ? VOICED_BONUS : 0) +
        (p.tense ? TENSE_BONUS : 0)
]));
export const invalidBoundaryClusters = [
    /rɜ/,
    /ɜr/,
    /ʃh/,
    /sʃ/,
    /ʒs/,
];
const invalidGeneralClusters = [
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
];
export const invalidOnsetClusters = [
    ...invalidGeneralClusters,
    /^[wrlvznmjhʃ].{1,2}/,
    /^.[wzgdbθhvʃsf]/,
    /[^s]k/,
    /t[θd]/,
    /dl/,
    /dʒ./,
    /pn/,
    /^sr/,
];
export const invalidCodaClusters = [
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
];
