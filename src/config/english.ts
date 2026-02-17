import { Affix, AffixSyllable, BoundaryTransform, LanguageConfig } from "./language.js";

// ---------------------------------------------------------------------------
// Shared boundary transforms
// ---------------------------------------------------------------------------

const Y_TO_I: BoundaryTransform = { name: 'y-to-i', match: /([^aeiou])y$/i, replace: '$1i' };
const DROP_SILENT_E: BoundaryTransform = { name: 'drop-silent-e', match: /e$/i, replace: '' };
const DOUBLE_CONSONANT: BoundaryTransform = { name: 'double-consonant', match: /([^aeiou])([aeiou])([bcdfghlmnprst])$/i, replace: '$1$2$3$3', blockedBy: ['drop-silent-e'] };

const BT_E_DOUBLE: BoundaryTransform[] = [DROP_SILENT_E, DOUBLE_CONSONANT];
const BT_Y: BoundaryTransform[] = [Y_TO_I];
const BT_E: BoundaryTransform[] = [DROP_SILENT_E];
const BT_ALL: BoundaryTransform[] = [Y_TO_I, DROP_SILENT_E, DOUBLE_CONSONANT];
import {
  VOICED_BONUS,
  TENSE_BONUS,
  SYLLABLE_COUNT_WEIGHTS,
  SYLLABLE_COUNT_WEIGHTS_TEXT,
  SYLLABLE_COUNT_WEIGHTS_LEXICON,
  LETTER_LENGTH_TARGETS,
  ONSET_LENGTH_MONOSYLLABIC,
  ONSET_LENGTH_FOLLOWING_NUCLEUS,
  ONSET_LENGTH_DEFAULT,
  CODA_LENGTH_MONOSYLLABIC,
  CODA_LENGTH_MONOSYLLABIC_DEFAULT,
  CODA_ZERO_WEIGHT_END_OF_WORD,
  CODA_ZERO_WEIGHT_MID_WORD,
  CODA_LENGTH_POLYSYLLABIC_NONZERO,
  FINAL_S_CHANCE,
  BOUNDARY_DROP_CHANCE,
  NASAL_STOP_EXTENSION_CHANCE,
  HAS_ONSET_START_OF_WORD,
  HAS_ONSET_AFTER_CODA,
  HAS_CODA_MONOSYLLABIC,
  HAS_CODA_END_OF_WORD,
  HAS_CODA_MID_WORD,
} from "./weights.js";
import {
  phonemes,
  phonemeMaps,
  sonorityToMannerOfArticulation,
  sonorityToPlaceOfArticulation,
} from "../elements/phonemes.js";
import { graphemes, graphemeMaps } from "../elements/graphemes/index.js";

/**
 * Banned cross-syllable [coda, onset] pairs for English.
 */
const ENGLISH_BANNED_CLUSTERS: [string, string][] = [
  // /ŋ/ before anything except /k/, /g/
  ["ŋ", "p"], ["ŋ", "b"], ["ŋ", "t"], ["ŋ", "d"],
  ["ŋ", "f"], ["ŋ", "v"], ["ŋ", "θ"], ["ŋ", "ð"],
  ["ŋ", "s"], ["ŋ", "z"], ["ŋ", "ʃ"], ["ŋ", "ʒ"],
  ["ŋ", "tʃ"], ["ŋ", "dʒ"], ["ŋ", "m"], ["ŋ", "n"],
  ["ŋ", "l"], ["ŋ", "r"], ["ŋ", "j"], ["ŋ", "w"],
  ["ŋ", "h"],
  // /ʒ/ before stops
  ["ʒ", "p"], ["ʒ", "b"], ["ʒ", "t"], ["ʒ", "d"],
  ["ʒ", "k"], ["ʒ", "g"],
  // /ð/ before stops
  ["ð", "p"], ["ð", "b"], ["ð", "t"], ["ð", "d"],
  ["ð", "k"], ["ð", "g"],
  // Same-place stop sequences
  ["p", "b"], ["b", "p"],
  ["t", "d"], ["d", "t"],
  ["k", "g"], ["g", "k"],
  // Nasal+stop place mismatches
  ["m", "k"], ["m", "g"],
  ["n", "p"], ["n", "b"],
];

/**
 * English language configuration built from existing phoneme/grapheme data.
 * Consumed by {@link createGenerator} to produce the default English word generator.
 */
export const englishConfig: LanguageConfig = {
  id: "en",
  name: "English",

  phonemes,
  phonemeMaps,

  graphemes,
  graphemeMaps,

  invalidClusters: {
    onset: [],
    coda: [],
    boundary: [],
  },

  sonorityHierarchy: {
    mannerOfArticulation: sonorityToMannerOfArticulation,
    placeOfArticulation: sonorityToPlaceOfArticulation,
    voicedBonus: VOICED_BONUS,
    tenseBonus: TENSE_BONUS,
  },

  syllableStructure: {
    maxOnsetLength: 3,
    maxCodaLength: 4,
    maxNucleusLength: 1,
    syllableCountWeights: SYLLABLE_COUNT_WEIGHTS,
    syllableCountWeightsText: SYLLABLE_COUNT_WEIGHTS_TEXT,
    syllableCountWeightsLexicon: SYLLABLE_COUNT_WEIGHTS_LEXICON,
    letterLengthTargets: LETTER_LENGTH_TARGETS,
  },

  generationWeights: {
    onsetLength: {
      monosyllabic: ONSET_LENGTH_MONOSYLLABIC,
      followingNucleus: ONSET_LENGTH_FOLLOWING_NUCLEUS,
      default: ONSET_LENGTH_DEFAULT,
    },
    codaLength: {
      monosyllabic: CODA_LENGTH_MONOSYLLABIC,
      monosyllabicDefault: CODA_LENGTH_MONOSYLLABIC_DEFAULT,
      polysyllabicNonzero: CODA_LENGTH_POLYSYLLABIC_NONZERO,
      zeroWeightEndOfWord: CODA_ZERO_WEIGHT_END_OF_WORD,
      zeroWeightMidWord: CODA_ZERO_WEIGHT_MID_WORD,
    },
    probability: {
      hasOnsetStartOfWord: HAS_ONSET_START_OF_WORD,
      hasOnsetAfterCoda: HAS_ONSET_AFTER_CODA,
      hasCodaMonosyllabic: HAS_CODA_MONOSYLLABIC,
      hasCodaEndOfWord: HAS_CODA_END_OF_WORD,
      hasCodaMidWord: HAS_CODA_MID_WORD,
      finalS: FINAL_S_CHANCE,
      boundaryDrop: BOUNDARY_DROP_CHANCE,
      nasalStopExtension: NASAL_STOP_EXTENSION_CHANCE,
    },
  },

  stress: {
    strategy: "weight-sensitive",
    disyllabicWeights: [75, 25],
    polysyllabicWeights: {
      heavyPenult: 45,
      lightPenult: 25,
      antepenultHeavy: 15,
      antepenultLight: 30,
      initial: 30,
    },
    secondaryStressProbability: 40,
    secondaryStressHeavyWeight: 70,
    secondaryStressLightWeight: 30,
    rhythmicStressProbability: 40,
    stressedNucleusBan: ["ə"],
  },

  doubling: {
    enabled: true,
    trigger: "lax-vowel",
    probability: 80,
    maxPerWord: 1,
    neverDouble: ["v", "w", "x", "y", "q", "j", "dʒ", "h", "ŋ", "θ", "ð", "ʒ"],
    finalDoublingOnly: ["f", "s", "l", "z", "k"],
    suppressAfterReduction: true,
    suppressBeforeTense: true,
    unstressedModifier: 0,
    doubledForms: { k: 'ck', c: 'ck' },
    neverDoubleFinal: ['b', 'd', 'g'],
  },

  silentE: {
    enabled: true,
    probability: 35,
    swaps: [
      // /eɪ/ — "a" + e (make, lake, name); also digraph swaps
      { phoneme: "eɪ", from: "a", to: "a" },
      { phoneme: "eɪ", from: "ai", to: "a" },
      { phoneme: "eɪ", from: "ae", to: "a" },
      { phoneme: "eɪ", from: "ea", to: "a" },
      // /iː/ — "e" + e (these, Pete); also digraph swaps
      { phoneme: "i:", from: "e", to: "e" },
      { phoneme: "i:", from: "ee", to: "e" },
      { phoneme: "i:", from: "ea", to: "e" },
      // /aɪ/ — "i" + e (time, life); also digraph swaps
      { phoneme: "aɪ", from: "i", to: "i" },
      { phoneme: "aɪ", from: "igh", to: "i" },
      { phoneme: "aɪ", from: "ie", to: "i" },
      // /əʊ/ — "o" + e (home, bone); also digraph swaps
      { phoneme: "əʊ", from: "o", to: "o" },
      { phoneme: "əʊ", from: "ow", to: "o" },
      { phoneme: "əʊ", from: "oe", to: "o" },
      // /o/ — "o" + e (hope, note); also digraph swap
      { phoneme: "o", from: "o", to: "o" },
      { phoneme: "o", from: "oa", to: "o" },
      // /uː/ — "u" + e (rude, tube); also digraph swaps
      { phoneme: "u", from: "u", to: "u" },
      { phoneme: "u", from: "oo", to: "u" },
      { phoneme: "u", from: "ue", to: "u" },
    ],
    excludedCodas: ["w", "j", "h"],
    appendAfter: [
      { sound: "v", probability: 95 },
    ],
  },

  spellingRules: [
    {
      name: "magic-e",
      pattern: "([aiouy])e([bcdfghjklmnpqrstvwxyz])$",
      replacement: "$1$2e",
      probability: 98,
      scope: "syllable",
    },
    {
      name: "ks-to-x",
      pattern: "(?<!^)ks",
      replacement: "x",
      probability: 25,
    },
    {
      name: "cx-to-x",
      pattern: "cx",
      replacement: "x",
      probability: 100,
      scope: "word",
    },
    {
      name: "cw-to-qu",
      pattern: "cw",
      replacement: "qu",
      probability: 100,
      scope: "word",
    },
    {
      name: "hard-c-before-front-vowel",
      pattern: "c([eiy])(?=[bcdfghjklmnpqrstvwxyz])",
      replacement: "k$1",
      probability: 100,
      scope: "word",
    },
    {
      name: "no-final-v",
      pattern: "v$",
      replacement: "ve",
      probability: 95,
      scope: "word",
    },
    {
      name: "no-final-j",
      pattern: "j$",
      replacement: "ge",
      probability: 95,
      scope: "word",
    },
    {
      name: "no-final-i",
      pattern: "i$",
      replacement: "y",
      probability: 95,
      scope: "word",
    },
    {
      name: "ngx-to-nks",
      pattern: "ngx",
      replacement: "nks",
      probability: 100,
      scope: "word",
    },
    {
      name: "eng-to-ing",
      pattern: "eng(?=s?$)",
      replacement: "ing",
      probability: 95,
      scope: "word",
    },
    {
      name: "ngk-to-nk",
      pattern: "ng([kc])",
      replacement: "n$1",
      probability: 100,
      scope: "word",
    },
    {
      name: "ckt-to-ct",
      pattern: "ckt",
      replacement: "ct",
      probability: 100,
      scope: "word",
    },
    {
      name: "iy-to-y",
      pattern: "iy",
      replacement: "y",
      probability: 100,
      scope: "word",
    },
    {
      name: "uw-to-w",
      pattern: "uw",
      replacement: "w",
      probability: 100,
      scope: "word",
    },
    {
      name: "iw-to-w",
      pattern: "iw",
      replacement: "w",
      probability: 100,
      scope: "word",
    },
  ],

  clusterConstraint: {
    banned: ENGLISH_BANNED_CLUSTERS,
    repair: "drop-coda",
  },
  codaConstraints: {
    bannedCodas: ["h"],
    allowedFinal: [
      "p", "b", "t", "d", "k", "g",
      "f", "v", "s", "z", "ʃ", "ʒ",
      "tʃ", "dʒ",
      "m", "n", "ŋ",
      "l", "r", "θ",
    ],
    voicingAgreement: true,
    homorganicNasalStop: true,
    bannedNucleusCodaCombinations: [
      {
        nucleus: ["ɚ", "ɝ"],
        coda: ["ŋ"],
      },
    ],
  },

  clusterLimits: {
    maxOnset: 3,
    maxCoda: 3,
    codaAppendants: ["s", "z"],
    onsetPrependers: ["s"],
    attestedCodas: [
      // Liquid + obstruent
      ["l","p"],["l","b"],["l","t"],["l","d"],["l","k"],["l","f"],["l","v"],["l","s"],["l","z"],["l","θ"],["l","ʃ"],["l","tʃ"],["l","dʒ"],
      ["r","p"],["r","b"],["r","t"],["r","d"],["r","k"],["r","g"],["r","f"],["r","v"],["r","s"],["r","z"],["r","θ"],["r","ʃ"],["r","tʃ"],["r","dʒ"],
      // Liquid + nasal
      ["l","m"],["r","m"],["r","n"],["r","l"],
      // Nasal + homorganic stop
      ["m","p"],["m","b"],["n","t"],["n","d"],["ŋ","k"],
      // Nasal + fricative
      ["m","s"],["m","z"],["m","θ"],["n","s"],["n","z"],["n","θ"],["ŋ","s"],["ŋ","z"],["ŋ","θ"],
      // Nasal + affricate
      ["n","tʃ"],["n","dʒ"],
      // Obstruent + s/z
      ["p","s"],["b","z"],["t","s"],["d","z"],["k","s"],["g","z"],["f","s"],["v","z"],["θ","s"],
      // Stop + stop
      ["p","t"],["k","t"],
      // Fricative + stop
      ["f","t"],["s","p"],["s","t"],["s","k"],
      // Stop + θ
      ["p","θ"],
      // Fricative + θ
      ["f","θ"],
      // 3-consonant codas
      ["l","p","s"],["l","t","s"],["l","d","s"],["l","k","s"],["l","v","z"],["l","θ","s"],["l","p","t"],["l","f","θ"],
      ["r","p","s"],["r","t","s"],["r","d","s"],["r","k","s"],["r","v","z"],["r","θ","s"],
      ["m","p","s"],["n","t","s"],["n","d","s"],["ŋ","k","s"],["ŋ","k","θ"],
      ["k","s","t"],["k","t","s"],["f","t","s"],["s","t","s"],["s","p","s"],["s","k","s"],
      ["n","tʃ","t"],["n","dʒ","d"],
      // 4-consonant codas
      ["l","p","t","s"],["l","f","θ","s"],["ŋ","k","θ","s"],["k","s","t","s"],
    ],
    attestedOnsets: [
      ["p","l"],["p","r"],["b","l"],["b","r"],["t","r"],["d","r"],
      ["k","l"],["k","r"],["g","l"],["g","r"],["f","l"],["f","r"],
      ["θ","r"],["ʃ","r"],["t","w"],["k","w"],["s","w"],
      ["s","l"],["s","m"],["s","n"],["s","p"],["s","t"],["s","k"],
      ["s","p","l"],["s","p","r"],["s","t","r"],["s","k","r"],["s","k","w"],
    ],
  },

  writtenFormConstraints: {
    maxConsonantGraphemes: 4,
    consonantGraphemes: [
      "tch", "dge",                           // trigraphs (3 letters → 1 unit)
      "ch", "sh", "th", "ng", "ph", "wh", "ck", // digraphs (2 letters → 1 unit)
    ],
    maxConsonantLetters: 4,
    maxFinalConsonantLetters: 3,
    maxVowelLetters: 2,
    orthographicRepairs: [
      {
        name: 'hard-g-silent-u',
        boundaryMatch: /g([eiy])/i,
        insert: 'u',
      },
    ],
  },

  sonorityConstraints: {
    risingOnset: true,
    fallingCoda: true,
    minSonorityGap: 0,
    exempt: ["s", "z"],
  },

  vowelReduction: {
    enabled: true,
    rules: [
      { source: "ʌ", target: "ə", probability: 85 },
      { source: "ɛ", target: "ɪ", probability: 70 },
      { source: "e", target: "ɪ", probability: 70 },
      { source: "ɑ", target: "ə", probability: 65 },
      { source: "ɔ", target: "ə", probability: 60 },
      { source: "æ", target: "ə", probability: 40 },
      { source: "o", target: "ə", probability: 55 },
      { source: "ɜ", target: "ə", probability: 75 },
      { source: "ɪ", target: "ə", probability: 45 },  // roses [ˈɹoʊzɪz] → [ˈɹoʊzəz] — common in casual speech
    ],
    reduceSecondaryStress: true,
    secondaryStressProbability: 30,
    // Word-final is lower than medial because final vowels in open syllables
    // retain more perceptual salience, even though English does reduce many
    // finals heavily (sofa → [ˈsoʊfə]). This is a conservative choice that
    // keeps generated words more readable.
    positionalModifiers: {
      wordInitial: 0.70,
      wordMedial: 1.0,
      wordFinal: 0.65,
    },
  },

  morphology: {
    enabled: true,
    prefixes: [
      { type: 'prefix', written: 'un', phonemes: ["ʌ", "n"], syllables: [{ onset: [], nucleus: ["ʌ"], coda: ["n"] }], syllableCount: 1, stressEffect: 'secondary', frequency: 80 },
      { type: 'prefix', written: 're', phonemes: ["r", "ɪ"], syllables: [{ onset: ["r"], nucleus: ["ɪ"], coda: [] }], syllableCount: 1, stressEffect: 'secondary', frequency: 70 },
      { type: 'prefix', written: 'dis', phonemes: ["d", "ɪ", "s"], syllables: [{ onset: ["d"], nucleus: ["ɪ"], coda: ["s"] }], syllableCount: 1, stressEffect: 'secondary', frequency: 40 },
      { type: 'prefix', written: 'pre', phonemes: ["p", "r", "i:"], syllables: [{ onset: ["p", "r"], nucleus: ["i:"], coda: [] }], syllableCount: 1, stressEffect: 'secondary', frequency: 30 },
      { type: 'prefix', written: 'over', phonemes: ["əʊ", "v", "ɚ"], syllables: [{ onset: [], nucleus: ["əʊ"], coda: [] }, { onset: ["v"], nucleus: ["ɚ"], coda: [] }], syllableCount: 2, stressEffect: 'primary', frequency: 20 },
      { type: 'prefix', written: 'out', phonemes: ["aʊ", "t"], syllables: [{ onset: [], nucleus: ["aʊ"], coda: ["t"] }], syllableCount: 1, stressEffect: 'primary', frequency: 20 },
      { type: 'prefix', written: 'mis', phonemes: ["m", "ɪ", "s"], syllables: [{ onset: ["m"], nucleus: ["ɪ"], coda: ["s"] }], syllableCount: 1, stressEffect: 'secondary', frequency: 30 },
      { type: 'prefix', written: 'in', phonemes: ["ɪ", "n"], syllables: [{ onset: [], nucleus: ["ɪ"], coda: ["n"] }], syllableCount: 1, stressEffect: 'secondary', frequency: 50, allomorphs: [{ phonologicalCondition: { position: 'following', place: ['bilabial'] }, phonemes: ["ɪ", "m"], syllables: [{ onset: [], nucleus: ["ɪ"], coda: ["m"] }], syllableCount: 1, written: "im" }] },
    ] satisfies Affix[],
    suffixes: [
      { type: 'suffix', written: 'ing', phonemes: ["ɪ", "ŋ"], syllables: [{ onset: [], nucleus: ["ɪ"], coda: ["ŋ"] }], syllableCount: 1, stressEffect: 'none', frequency: 100, boundaryTransforms: BT_E_DOUBLE },
      { type: 'suffix', written: 'tion', phonemes: ["ʃ", "ə", "n"], syllables: [{ onset: ["ʃ"], nucleus: ["ə"], coda: ["n"] }], syllableCount: 1, stressEffect: 'attract-preceding', frequency: 80 },
      { type: 'suffix', written: 'ly', phonemes: ["l", "i:"], syllables: [{ onset: ["l"], nucleus: ["i:"], coda: [] }], syllableCount: 1, stressEffect: 'none', frequency: 90, boundaryTransforms: BT_Y },
      {
        type: 'suffix', written: 'ed', phonemes: ["d"], syllables: [], syllableCount: 0, stressEffect: 'none', frequency: 70,
        boundaryTransforms: BT_E_DOUBLE,
        allomorphs: [
          { phonologicalCondition: { position: 'preceding', voiced: false }, phonemes: ["t"], syllables: [], syllableCount: 0 },
          { phonologicalCondition: { position: 'preceding', voiced: true }, phonemes: ["d"], syllables: [], syllableCount: 0 },
          { phonologicalCondition: { position: 'preceding', manner: ['stop'], place: ['alveolar'] }, phonemes: ["ɪ", "d"], syllables: [{ onset: [], nucleus: ["ɪ"], coda: ["d"] }], syllableCount: 1, written: "ed" },
        ],
      },
      { type: 'suffix', written: 'ness', phonemes: ["n", "ə", "s"], syllables: [{ onset: ["n"], nucleus: ["ə"], coda: ["s"] }], syllableCount: 1, stressEffect: 'none', frequency: 60, boundaryTransforms: BT_Y },
      { type: 'suffix', written: 'er', phonemes: ["ɚ"], syllables: [{ onset: [], nucleus: ["ɚ"], coda: [] }], syllableCount: 1, stressEffect: 'none', frequency: 70, boundaryTransforms: BT_E_DOUBLE },
      { type: 'suffix', written: 'est', phonemes: ["ɪ", "s", "t"], syllables: [{ onset: [], nucleus: ["ɪ"], coda: ["s", "t"] }], syllableCount: 1, stressEffect: 'none', frequency: 40, boundaryTransforms: BT_E_DOUBLE },
      { type: 'suffix', written: 'ment', phonemes: ["m", "ə", "n", "t"], syllables: [{ onset: ["m"], nucleus: ["ə"], coda: ["n", "t"] }], syllableCount: 1, stressEffect: 'none', frequency: 50 },
      { type: 'suffix', written: 'able', phonemes: ["ə", "b", "ə", "l"], syllables: [{ onset: [], nucleus: ["ə"], coda: [] }, { onset: ["b"], nucleus: ["ə"], coda: ["l"] }], syllableCount: 2, stressEffect: 'none', frequency: 40, boundaryTransforms: BT_ALL },
      { type: 'suffix', written: 'ful', phonemes: ["f", "ə", "l"], syllables: [{ onset: ["f"], nucleus: ["ə"], coda: ["l"] }], syllableCount: 1, stressEffect: 'none', frequency: 40, boundaryTransforms: BT_Y },
      { type: 'suffix', written: 'less', phonemes: ["l", "ə", "s"], syllables: [{ onset: ["l"], nucleus: ["ə"], coda: ["s"] }], syllableCount: 1, stressEffect: 'none', frequency: 40 },
      { type: 'suffix', written: 'ous', phonemes: ["ə", "s"], syllables: [{ onset: [], nucleus: ["ə"], coda: ["s"] }], syllableCount: 1, stressEffect: 'attract-preceding', frequency: 30, boundaryTransforms: BT_E },
      { type: 'suffix', written: 'ive', phonemes: ["ɪ", "v"], syllables: [{ onset: [], nucleus: ["ɪ"], coda: ["v"] }], syllableCount: 1, stressEffect: 'attract-preceding', frequency: 30, boundaryTransforms: BT_E },
      { type: 'suffix', written: 'al', phonemes: ["ə", "l"], syllables: [{ onset: [], nucleus: ["ə"], coda: ["l"] }], syllableCount: 1, stressEffect: 'attract-preceding', frequency: 30, boundaryTransforms: BT_E },
      { type: 'suffix', written: 'ity', phonemes: ["ɪ", "t", "i:"], syllables: [{ onset: [], nucleus: ["ɪ"], coda: [] }, { onset: ["t"], nucleus: ["i:"], coda: [] }], syllableCount: 2, stressEffect: 'attract-preceding', frequency: 50, boundaryTransforms: BT_E },
      {
        type: 'suffix', written: 's', phonemes: ["z"], syllables: [], syllableCount: 0, stressEffect: 'none', frequency: 100,
        allomorphs: [
          { phonologicalCondition: { position: 'preceding', voiced: false }, phonemes: ["s"], syllables: [], syllableCount: 0 },
          { phonologicalCondition: { position: 'preceding', voiced: true }, phonemes: ["z"], syllables: [], syllableCount: 0 },
          { phonologicalCondition: { position: 'preceding', manner: ['sibilant', 'affricate'] }, phonemes: ["ɪ", "z"], syllables: [{ onset: [], nucleus: ["ɪ"], coda: ["z"] }], syllableCount: 1, written: "es" },
        ],
      },
    ] satisfies Affix[],
    templateWeights: {
      text: { bare: 55, suffixed: 30, prefixed: 10, both: 5 },
      lexicon: { bare: 40, suffixed: 35, prefixed: 15, both: 10 },
    },
  },

  clusterWeights: {
    coda: {
      final: {
        "t,s": 0.0001,    // Ultra-aggressive reduction for word-final pseudo-plurals
        "t,z": 0.0001,
        "n,s": 0.0001,    // Ultra-aggressive reduction  
        "n,z": 0.0001,
        "d,s": 0.0001,    // Also block after nasalStopExtension (n→nd+s)
        "d,z": 0.0001,
        "b,s": 0.0001,    // Also block after nasalStopExtension (m→mb+s)
        "b,z": 0.0001,
        "g,s": 0.0001,    // Also block after nasalStopExtension (ŋ→ŋg+s)
        "g,z": 0.0001,
      },
      nonFinal: {
        "t,s": 0.4,     // Moderate reduction for mid-word clusters
        "t,z": 0.4,
        "n,s": 0.4,
        "n,z": 0.4,
        "d,s": 0.4,
        "d,z": 0.4,
        "b,s": 0.4,
        "b,z": 0.4,
        "g,s": 0.4,
        "g,z": 0.4,
      },
    },
  },
};
