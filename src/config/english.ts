import { lexiconReference } from "./lexicon-reference.js";
import { englishDoublingRealizations } from "../elements/graphemes/doubling.js";
import { Affix, BoundaryClusterConstraintRule, BoundaryTransform, LanguageConfig, defaultFallbackBridgeOnsets } from "./language.js";

// ---------------------------------------------------------------------------
// Shared boundary transforms
// ---------------------------------------------------------------------------

const Y_TO_I: BoundaryTransform = { name: "y-to-i", match: /([^aeiou])y$/i, replace: "$1i" };
/** Consonant+y before `-s` → root `…i` and the `-es` spelling (`cries`), not `-is`. */
const Y_TO_I_ES: BoundaryTransform = { ...Y_TO_I, affixWritten: "es" };
/** A closed English root can end in a silent marker (bake, face). In an
 * open root the final e belongs to the vowel spelling (be, pie, free). */
const DROP_SILENT_E: BoundaryTransform = {
  name: "drop-silent-e",
  match: /(?<!e)e$/i,
  replace: "",
  boundarySyllable: [{ hasCoda: true }],
  affixMatch: /^[aeiou]/i,
};
/** Share the suffix's initial e with root-final ee (free + ed → freed). */
const SHARE_FINAL_E: BoundaryTransform = {
  name: "share-final-e",
  match: /(e)e$/i,
  replace: "$1",
  affixMatch: /^e/i,
};
/**
 * Full short vowels: one vowel letter before a final consonant reads short,
 * so a vowel suffix must double the consonant to keep that reading. These are
 * the checked vowels (`bed`, `kidnap`) and the lot/thought vowels that a single
 * `o` or `a` spells in American English (`stop` /stɑp/, `dog`). Long vowels
 * and diphthongs are left out: their one-letter spelling already reads long
 * before a vowel (`bated`, not `batted`, for /beɪt/). Schwa is left out because
 * a reduced vowel does not double (`gallop` → `galloped`).
 */
const FULL_SHORT_NUCLEI = ["ɪ", "ɛ", "æ", "ʌ", "ʊ", "ɑ", "ɔ", "ɜ"] as const;
/**
 * Double a root-final single consonant after a single vowel letter before a
 * vowel suffix only when the root's final syllable is stressed and its vowel
 * is short: `commit` → `committed`, `stop` → `stopping`; `visit` → `visited`,
 * `letter` → `lettered`. Monosyllabic roots carry primary stress.
 *
 * - Primary stress also doubles after /ɚ/, the r-coloured vowel
 *   (`occur` → `occurred`, `refer` → `referred`).
 * - Secondary stress doubles after a full short vowel (`kidnapped`,
 *   `handicapped`, `zigzagged`), not after /ɚ/ (#476: secondary stress on a
 *   reduced vowel).
 * - An unstressed final syllable never doubles, as in American spelling
 *   (`worshiped`, `traveled`; British `travelled` doubles `l`).
 */
const DOUBLE_CONSONANT: BoundaryTransform = {
  name: "double-consonant",
  match: /([^aeiou])([aeiou])([bcdfghlmnprst])$/i,
  replace: "$1$2$3$3",
  blockedBy: ["drop-silent-e"],
  boundarySyllable: [
    { stress: ["primary"], nucleus: { sounds: [...FULL_SHORT_NUCLEI, "ɚ"] } },
    { stress: ["secondary"], nucleus: { sounds: FULL_SHORT_NUCLEI } },
  ],
};

/** Handle final e before a written vowel suffix, including the `-es` allomorph. */
const BT_E: BoundaryTransform[] = [DROP_SILENT_E, SHARE_FINAL_E];
/** Used by i-initial `-ing`, which keeps final y. */
const BT_E_DOUBLE: BoundaryTransform[] = [...BT_E, DOUBLE_CONSONANT];
/** y→i then handle final e — non-i Latinate suffixes. */
const BT_Y_E: BoundaryTransform[] = [Y_TO_I, ...BT_E];
/** y→i then the `-ed`/`-er`/`-est` cluster (and `-able`). */
const BT_Y_E_DOUBLE: BoundaryTransform[] = [Y_TO_I, ...BT_E_DOUBLE];
const BT_ALL: BoundaryTransform[] = BT_Y_E_DOUBLE;
const BT_S: BoundaryTransform[] = [Y_TO_I_ES, ...BT_E];

/**
 * Nucleus phonemes whose e-digraph magic-e splits (ie, ye → i_e; ue → u_e;
 * ae → a_e; oe → o_e; aue → au_e). /i:/ ie is left whole: split, it read
 * /aɪ/ (vutice → vutiek, as in shriek; urlifeful → urliefful, as in chief).
 */
const SPLIT_VOWELS = ["aɪ", "u", "eɪ", "əʊ", "ɑ"];

/**
 * A root-final double consonant before a suffix starting with the same letter
 * keeps two letters, not three (full + ly → fully; #474: melillly, yaffful).
 */
function collapseDoubleBefore(letter: string): BoundaryTransform {
  return { name: "collapse-triple-letter", match: new RegExp(`${letter}${letter}$`, "i"), replace: letter };
}
/** y→i, then the triple-letter collapse — non-i suffixes starting with a consonant. */
const btYJoin = (suffixWritten: string): BoundaryTransform[] => [Y_TO_I, collapseDoubleBefore(suffixWritten[0])];

import {
  VOICED_BONUS,
  TENSE_BONUS,
  PHONEME_LENGTH_WEIGHTS_TEXT,
  PHONEME_LENGTH_WEIGHTS_LEXICON,
  PHONEME_TO_SYLLABLE_WEIGHTS_TEXT,
  PHONEME_TO_SYLLABLE_WEIGHTS_LEXICON,
  LETTER_LENGTH_TARGETS,
  ONSET_LENGTH_MONOSYLLABIC,
  ONSET_LENGTH_FOLLOWING_NUCLEUS,
  ONSET_LENGTH_DEFAULT,
  ONSET_LENGTH_LONG,
  CODA_LENGTH_MONOSYLLABIC,
  CODA_LENGTH_MONOSYLLABIC_DEFAULT,
  CODA_ZERO_WEIGHT_END_OF_WORD,
  CODA_ZERO_WEIGHT_MID_WORD,
  CODA_LENGTH_POLYSYLLABIC_NONZERO,
  FINAL_S_CHANCE,
  EQUAL_SONORITY_DROP_CHANCE,
  RISING_CODA_BOUNDARY_DROP_CHANCE,
  NASAL_STOP_EXTENSION_CHANCE,
  HAS_ONSET_START_OF_WORD,
  HAS_ONSET_AFTER_CODA,
  HAS_CODA_MONOSYLLABIC,
  HAS_CODA_END_OF_WORD,
  HAS_CODA_MID_WORD,
} from "./weights.js";
import {
  ENGLISH_PARTIAL_QUANTITY_ANALYSIS,
  phonemes,
  phonemeMaps,
  sonorityToMannerOfArticulation,
  sonorityToPlaceOfArticulation,
} from "../elements/phonemes.js";
import { graphemes, graphemeMaps } from "../elements/graphemes/index.js";
import { HELD_CODAS } from "../elements/graphemes/open-reading.js";

const OBSTRUENT_MANNERS: NonNullable<BoundaryClusterConstraintRule["coda"]["manner"]> =
  ["stop", "fricative", "sibilant", "affricate"];

/** Rule-based cross-syllable constraints for English coda→onset boundaries. */
const ENGLISH_BOUNDARY_CLUSTER_RULES: BoundaryClusterConstraintRule[] = [
  // /ŋ/ may only be followed by velars (e.g. /k/, /g/ in current inventory).
  { mode: "allow-only", coda: { sounds: ["ŋ"] }, onset: { place: ["velar"] } },

  // /ʒ/ and /ð/ are strongly disfavored before stop onsets.
  { mode: "ban", coda: { sounds: ["ʒ", "ð"] }, onset: { manner: ["stop"] } },

  // Same-place stop sequences with opposite voicing are disallowed.
  { mode: "ban", coda: { manner: ["stop"] }, onset: { manner: ["stop"] }, relation: { place: "same", voiced: "different" } },

  // Bilabial nasal + velar stop boundaries are disallowed.
  { mode: "ban", coda: { sounds: ["m"] }, onset: { manner: ["stop"], place: ["velar"] } },

  // Rare/impossible across a syllable join in English; spelling dedup then
  // hides them by erasing a letter that belonged to a different sound (#418):
  // /ʃ.h/ (`sh`+`h`→`sh`) and /k.tʃ/ (`k`+`ch`→`ch`).
  { mode: "ban", coda: { sounds: ["ʃ"] }, onset: { sounds: ["h"] } },
  { mode: "ban", coda: { sounds: ["k"] }, onset: { sounds: ["tʃ"] } },

  // Root-internal voicing restrictions (#485).
  { mode: "ban", coda: {}, onset: { sounds: ["ʒ", "ð"] } },
  {
    mode: "ban",
    coda: { manner: OBSTRUENT_MANNERS, voiced: false },
    onset: { manner: OBSTRUENT_MANNERS, voiced: true },
    except: [["s", "b"], ["s", "d"], ["s", "g"]],
  },
  {
    mode: "ban",
    coda: { manner: OBSTRUENT_MANNERS, voiced: true },
    onset: { sounds: ["p", "t", "k", "f", "θ", "s", "ʃ", "tʃ"] },
    // /z/ before /p t k/ can still be written as sp, st, or sk. See #496.
    except: [["b", "s"], ["d", "s"], ["z", "p"], ["z", "t"], ["z", "k"]],
  },
  {
    mode: "ban",
    coda: { sounds: ["g", "z", "v", "ð", "ʒ", "dʒ"] },
    onset: { sounds: ["v", "z", "dʒ"] },
    except: [["g", "z"]],
  },
  { mode: "ban", coda: { sounds: ["m"] }, onset: { sounds: ["v", "dʒ"] } },
];

const lexiconTemplates = Object.values(lexiconReference.templates).reduce(
  (total, counts) => ({
    bare: total.bare + counts.bare,
    suffixed: total.suffixed + counts.suffixed,
    prefixed: total.prefixed + counts.prefixed,
    both: total.both + counts.both,
  }),
  { bare: 0, suffixed: 0, prefixed: 0, both: 0 },
);

const measuredAffixFrequencies: Readonly<Record<string, number>> = lexiconReference.affixFrequencies;
const measuredAffixes = new Set(Object.keys(measuredAffixFrequencies));

function withLexiconAffixFrequencies(affixes: Affix[]): Affix[] {
  return affixes.map(affix => {
    if (!Object.hasOwn(measuredAffixFrequencies, affix.written)) {
      throw new Error(`Missing measured lexicon frequency for ${affix.type} "${affix.written}"`);
    }
    measuredAffixes.delete(affix.written);
    return { ...affix, frequencyByMode: { lexicon: measuredAffixFrequencies[affix.written] } };
  });
}

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
  graphemeConditionAliases: {
    bareSyllableNucleus: {
      syllableShape: {
        onset: "empty",
        coda: "empty",
      },
    },
    // "ea" is not followed by another vowel letter (no "eaed", "eaable").
    notBeforeVowelLetter: {
      notRightGraphemeContext: ["a", "e", "i", "o", "u"],
    },
  },

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
    letterLengthTargets: LETTER_LENGTH_TARGETS,
  },

  generationWeights: {
    onsetLength: {
      monosyllabic: ONSET_LENGTH_MONOSYLLABIC,
      followingNucleus: ONSET_LENGTH_FOLLOWING_NUCLEUS,
      default: ONSET_LENGTH_DEFAULT,
      long: ONSET_LENGTH_LONG,
    },
    codaLength: {
      rootFinalByMode: {
        lexicon: { counts: lexiconReference.finalCodaCounts, lengths: lexiconReference.finalCodaLengths },
      },
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
      nasalStopExtension: NASAL_STOP_EXTENSION_CHANCE,
    },
    boundaryPolicy: {
      equalSonorityDrop: EQUAL_SONORITY_DROP_CHANCE,
      risingCodaDrop: RISING_CODA_BOUNDARY_DROP_CHANCE,
    },
  },

  hiatusPolicy: {
    // Keep most plan decrements from creating V.V boundaries, but allow a
    // small tail so hiatus remains possible (not hard-zeroed).
    planGuardProbability: 98,
    // Rare-but-nonzero post-vowel glide onsets (CMU-aligned direction).
    postVowelGlideMultiplier: 0.08,
    fallbackBridgeOnsets: defaultFallbackBridgeOnsets(),
  },

  phonemeLengthWeights: {
    text: PHONEME_LENGTH_WEIGHTS_TEXT,
    lexicon: PHONEME_LENGTH_WEIGHTS_LEXICON,
  },

  phonemeToSyllableWeights: {
    text: PHONEME_TO_SYLLABLE_WEIGHTS_TEXT,
    lexicon: PHONEME_TO_SYLLABLE_WEIGHTS_LEXICON,
  },

  pronunciation: {
    stress: {
      syllableWeight: {
        type: "moraic",
        analysis: ENGLISH_PARTIAL_QUANTITY_ANALYSIS,
        coda: "weight-by-position",
        unknown: "legacy-segment-count",
      },
      primary: {
        type: "ot",
        otConfig: {
          constraints: [
            { name: "WSP", weight: 3 },
            { name: "ALIGN-LEFT", weight: 6.5 },
            { name: "ALIGN-RIGHT", weight: 1 },
            { name: "NONFINALITY", weight: 12 },
            { name: "NONINITIAL", weight: 8.5 },
          ],
          noise: 4,
        },
      },
      secondary: {
        enabled: true,
        probability: 40,
        heavyWeight: 70,
        lightWeight: 30,
        candidateWindow: "first-three",
      },
      rhythmic: {
        enabled: true,
        probability: 40,
        requireUnstressedNeighbors: true,
      },
      nucleus: {
        stressedNucleusBan: ["ə"],
      },
    },
    aspiration: {
      enabled: true,
      targets: [
        {
          segment: "onset",
          index: 0,
          manner: ["stop"],
          voiced: false,
        },
      ],
      rules: [
        { id: "post-s", when: { previousCodaSounds: ["s"] }, probability: 5 },
        { id: "word-initial", when: { wordInitial: true }, probability: 95 },
        { id: "stressed-onset", when: { stressed: true }, probability: 90 },
        { id: "post-stressed", when: { postStressed: true }, probability: 50 },
      ],
      fallbackProbability: 30,
    },
    vowelReduction: {
      enabled: true,
      rules: [
        { source: "ʌ", target: "ə", probability: 85 },
        { source: "ɛ", target: "ɪ", probability: 70 },
        { source: "ɑ", target: "ə", probability: 65 },
        { source: "ɔ", target: "ə", probability: 60 },
        { source: "æ", target: "ə", probability: 40 },
        { source: "ɜ", target: "ə", probability: 75 },
        {
          // roses [ˈɹoʊzɪz] → [ˈɹoʊzəz] — common in casual speech; still applies in open
          // syllables and before unlisted codas such as /z s d t n l/.
          source: "ɪ",
          target: "ə",
          probability: 45,
          // CMU keeps unstressed /ɪ/ before /ŋ/ (99% in final syllables, as in -ing) and mostly
          // before velars and postalveolars and /v/ (final k 82%, ʃ 89%,
          // tʃ 93%, dʒ 70%, v 94%; medial g 77%), so reduction stops there.
          codaModifiers: [{ sounds: ["ŋ", "k", "g", "ʃ", "tʃ", "dʒ", "v"], multiplier: 0 }],
        },
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
    doubledForms: { k: "ck", c: "ck" },
    realizations: englishDoublingRealizations,
    neverDoubleFinal: ["b", "d", "g"],
    // English does not double after "ea": head, heavy, feather (not "headd").
    neverDoubleAfter: ["ea"],
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
      // Open-only mono "ye" still needs a silent-e path for split share.
      { phoneme: "aɪ", from: "ye", to: "i" },
      // /əʊ/ — "o" + e (home, bone); also digraph swaps
      { phoneme: "əʊ", from: "o", to: "o" },
      { phoneme: "əʊ", from: "ow", to: "o" },
      { phoneme: "əʊ", from: "oe", to: "o" },
      // /uː/ — "u" + e (rude, tube); also digraph swaps
      { phoneme: "u", from: "u", to: "u" },
      { phoneme: "u", from: "oo", to: "u" },
      { phoneme: "u", from: "ue", to: "u" },
      // Open-only mono "ew" → silent-e when split share is short.
      { phoneme: "u", from: "ew", to: "u" },
    ],
    excludedCodas: ["w", "j", "h"],
    appendAfter: [
      { sound: "v", probability: 95 },
    ],
    // A split reads long across one consonant (time, tune), not a cluster or a
    // digraph consonant (#470: rinse; snunde, bakadse). /eɪ/ keeps change and
    // paste. /əʊ/ is left as it was (most, folk).
    codaLimit: {
      phonemes: ["aɪ", "eɪ", "i:", "u"],
      clusters: { "eɪ": [["n", "dʒ"], ["s", "t"]] },
      heldCodas: HELD_CODAS,
    },
  },

  gapSpellings: [
    { name: "be", phonemes: ["b", "i:"], replacement: "be", targetLayer: "grapheme" },
    { name: "he", phonemes: ["h", "i:"], replacement: "he", targetLayer: "grapheme" },
    { name: "me", phonemes: ["m", "i:"], replacement: "me", targetLayer: "grapheme" },
    { name: "we", phonemes: ["w", "i:"], replacement: "we", targetLayer: "grapheme" },
    { name: "to", phonemes: ["t", "u"], replacement: "to", weight: 85, targetLayer: "grapheme" },
    { name: "two", phonemes: ["t", "u"], replacement: "two", weight: 15, targetLayer: "grapheme" },
    { name: "do", phonemes: ["d", "u"], replacement: "do", targetLayer: "grapheme" },
    { name: "you", phonemes: ["j", "u"], replacement: "you", targetLayer: "grapheme" },
    { name: "any", phonemes: ["ɛ", "n", "i:"], replacement: "any", hyphenated: "a&shy;ny", targetLayer: "grapheme" },
    { name: "people", phonemes: ["p", "i:", "p", "ə", "l"], replacement: "people", hyphenated: "peo&shy;ple", targetLayer: "spellingRule" },
    { name: "would", phonemes: ["w", "ʊ", "d"], replacement: "would", targetLayer: "spellingRule" },
    { name: "could", phonemes: ["k", "ʊ", "d"], replacement: "could", targetLayer: "spellingRule" },
    { name: "who", phonemes: ["h", "u"], replacement: "who", targetLayer: "grapheme" },
    { name: "when", phonemes: ["w", "ɛ", "n"], replacement: "when", targetLayer: "grapheme" },
    { name: "which", phonemes: ["w", "ɪ", "tʃ"], replacement: "which", targetLayer: "grapheme" },
    { name: "what", phonemes: ["w", "ɑ", "t"], replacement: "what", targetLayer: "grapheme" },
  ],

  spellingRules: [
    {
      name: "nc-to-nk",
      pattern: "nc(?=[^eiyaouhlr]|$)",
      replacement: "nk",
      probability: 100,
      scope: "word",
    },
    {
      // Closed-final /eɪ/ "ae" before hard c (#459 follow-up): magic-e would
      // write "ace" (batace), which reads /eɪs/. Spell the stop "k" so the split
      // gives "ake" (bake). Only the c is rewritten, so "ae" keeps its nucleus
      // alignment for magic-e.
      name: "ae-hard-c-to-k",
      pattern: "(?<=ae)(ck?)$",
      replacement: "k",
      probability: 100,
      scope: "syllable",
      letterRoles: [{ group: 1, segment: "coda" }],
    },
    {
      // Same for hard g: magic-e "age" reads /eɪdʒ/ (bovages). English writes
      // /eɪg/ as "ague" (vague, plague).
      name: "ae-hard-g-to-gue",
      pattern: "(a)(e)(g)$",
      replacement: "$1gue",
      probability: 100,
      scope: "syllable",
      letterRoles: [
        { group: 1, segment: "nucleus" },
        { group: 2, segment: "nucleus" },
        { group: 3, segment: "coda" },
      ],
    },
    {
      // Same for a closed ie or ue (#470): magic-e would write "ice"/"uce" for
      // /aɪk/ /uk/ (bices, mucetuns), which read /s/. Spell the /k/ "k" so the
      // split gives bike, duke. /i:/ ie is never split, so it stays "iek"
      // (/i:k/, as in shriek). The coda sound check leaves a /s/ "c" alone (ice).
      name: "ie-ue-hard-c-to-k",
      pattern: "(?<=[iu]e)(ck?)$",
      replacement: "k",
      probability: 100,
      scope: "syllable",
      letterRoles: [{ group: 1, segment: "coda", sounds: ["k"] }],
    },
    {
      // A split vowel digraph (tiem → time, tyep → type). The vowel letters must
      // spell the nucleus and the consonant a coda: not /j/ + e (yet), coda "ed"
      // (slaed /slæd/), or a nucleus "er" (yer /jɚ/). Not /i:/ ie (#470): split,
      // it read /aɪ/ (vutice); unsplit it reads /i:/ (vutiek, as in shriek).
      name: "magic-e",
      pattern: "([aiouy])(e)([bcdfghjklmnpqrstvwxyz])$",
      replacement: "$1$3e",
      probability: 95,
      scope: "syllable",
      letterRoles: [
        { group: 1, segment: "nucleus", sounds: SPLIT_VOWELS },
        { group: 2, segment: "nucleus", sounds: SPLIT_VOWELS },
        { group: 3, segment: "coda" },
      ],
    },
    {
      // Magic-e's 5% miss leaves a closed /aɪ/ ie or /u/ ue unsplit, which reads
      // /i:/ or /ju/ (#470: cieftow as in chief, atier). Since #470 those are
      // chosen only where magic-e can split them, so finish the split. /i:/ ie
      // (field) is not touched: the sound check keeps it.
      name: "magic-e-ie-ue",
      pattern: "([iu])(e)([bcdfghjklmnpqrstvwxyz])$",
      replacement: "$1$3e",
      probability: 100,
      scope: "syllable",
      letterRoles: [
        { group: 1, segment: "nucleus", sounds: ["aɪ", "u"] },
        { group: 2, segment: "nucleus", sounds: ["aɪ", "u"] },
        { group: 3, segment: "coda" },
      ],
    },
    {
      // The same for closed /aɪ/ ie and /u/ ue (#470): a coda spelled with a
      // final e (ce, se, ze, ve) is already the split marker, which magic-e
      // cannot cross, so drop the digraph's e (fliece → flice, as in ice, five).
      name: "ie-ue-before-e-coda",
      pattern: "([iu])(e)([bcdfgjklmnpqrstvz]e)$",
      replacement: "$1$3",
      probability: 100,
      scope: "syllable",
      letterRoles: [
        { group: 1, segment: "nucleus", sounds: ["aɪ", "u"] },
        { group: 2, segment: "nucleus", sounds: ["aɪ", "u"] },
        { group: 3, segment: "coda" },
      ],
    },
    {
      // A closed "ae" whose coda is one consonant spelled with a final e ("ge",
      // "ce", "gue"), or "nge": that e marks the vowel, so "ae" drops its own e
      // (ataege → atage, snaenge → snange, as in page, pace, vague, range).
      // Other clusters (faelse) would not read /eɪ/ (false), so they fall
      // through to ae-unsplit-to-ai.
      name: "ae-before-e-coda",
      pattern: "(a)(e)([bcdfghjklmnpqrstvwxz]u?e|nge)$",
      replacement: "$1$3",
      probability: 100,
      scope: "syllable",
      letterRoles: [
        { group: 1, segment: "nucleus" },
        { group: 2, segment: "nucleus" },
        { group: 3, segment: "coda" },
      ],
    },
    {
      // A closed "ae" that magic-e left unsplit (#459 follow-up): a coda it
      // cannot cross, such as "ch" (fubaech) or "ssi", or its 5% miss (bepaen).
      // English writes closed /eɪ/ as "ai" there (faith, pain). The role check
      // keeps the third group to coda letters, so it may end in a vowel letter.
      name: "ae-unsplit-to-ai",
      pattern: "(a)(e)([a-z]+)$",
      replacement: "$1i$3",
      probability: 100,
      scope: "syllable",
      letterRoles: [
        { group: 1, segment: "nucleus" },
        { group: 2, segment: "nucleus" },
        { group: 3, segment: "coda" },
      ],
    },
    {
      name: "ew-cluster-simplify",
      pattern: "ew(?=[bcdfghjklmnpqrstvwxyz]{2})",
      replacement: "u",
      probability: 100,
      scope: "syllable",
    },
    {
      name: "ow-cluster-simplify",
      pattern: "ow(?=[bcdfghjklmnpqrstvwxyz]{2})",
      replacement: "ou",
      probability: 100,
      scope: "syllable",
    },
    {
      // After a vowel (box, flex), a vowel + ck (necks → nex) or n (jinx)
      // only: English keeps ks after other consonants (desks, milks, works),
      // not sx, lx, rx.
      name: "ks-to-x",
      pattern: "(?<=[aeiouy]c|[aeiouyn])ks",
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
      name: "cst-to-xt",
      pattern: "cs(?=t)",
      replacement: "x",
      probability: 100,
      scope: "word",
    },
    {
      name: "gz-to-x",
      pattern: "gz(?=[aeiouy])",
      replacement: "x",
      probability: 85,
      scope: "word",
    },
    {
      name: "sibilant-s-epenthesis",
      pattern: "((?:t?ch)|sh)s",
      replacement: "$1es",
      probability: 100,
      scope: "word",
    },
    {
      // qu before a u-letter vowel would write "quu" (#474: squuce, dilquung).
      // Write the /kw/ as "kw" there instead.
      name: "cw-before-u-to-kw",
      pattern: "cw(?=u)",
      replacement: "kw",
      probability: 100,
      scope: "word",
    },
    {
      name: "cw-to-qu",
      pattern: "cw(?!u)",
      replacement: "qu",
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
    rules: ENGLISH_BOUNDARY_CLUSTER_RULES,
    repair: "drop-coda",
  },
  forbidOpenCheckedFinal: true,
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
      // The rhotic vowels already carry the r-colouring. CMU has ER + R only
      // across affix and compound joins (overrule, interracial); inside a root
      // the /r/ merges into the vowel (stirring /ɚ ɪ ŋ/, furry /ɚ i/).
      {
        nucleus: ["ɚ", "ɝ"],
        coda: ["r"],
        followingOnset: true,
      },
    ],
    // An /r/ onset before an r-coloured rime (drur /drɚ/, trurl /trɚl/, brert
    // /brɛrt/) is rare in English roots: CMU has a few word-final cases
    // (terror, mirror, rear, roar) and almost none inside a word (#497).
    bannedOnsetRimeCombinations: [
      { onsetFinal: ["r"], nucleus: ["ɚ", "ɝ"], coda: ["r"] },
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
    policy: "preserve-phones",
    maxConsonantGraphemes: 4,
    consonantGraphemes: [
      "tch", "dge", "sch",                    // trigraphs (3 letters → 1 unit)
      "ch", "sh", "th", "ng", "ph", "wh", "ck", // digraphs (2 letters → 1 unit)
    ],
    maxConsonantLetters: 4,
    maxFinalConsonantLetters: 3,
    maxVowelLetters: 2,
    orthographicRepairs: [
      {
        name: "hard-g-silent-u",
        boundaryMatch: /g([eiy])/i,
        insert: "u",
      },
    ],
    hardLetters: [
      {
        // c reads /s/ before e, i or y (#460). Selection only sees the next
        // phoneme, so /k/ → c before a schwa written e or i, /j/ → y, magic-e's
        // e, or an e/i-initial suffix read soft (farcew, winwocive, brice).
        name: "hard-c",
        phoneme: "k",
        letter: "c",
        softBefore: ["e", "i", "y"],
        afterShortVowel: "ck",
        otherwise: "k",
        shortVowels: ["ɪ", "ɛ", "æ", "ʌ", "ɑ", "ɔ", "ʊ", "ə"],
        // Root-final /k/ (#469): English ends a word in c almost only in -ic
        // and -ac (panic, maniac). After a consonant or a long vowel it writes
        // k (desk, milk, seek; magic-e gives ke), after another short vowel
        // ck (neck, rock); a final /ks/ the same way (desks, necks; ks-to-x
        // may then write x). A bare final c stays before -tion or an a/o/u
        // suffix (action, medical, fiscal, raucous); a final cs does not.
        rootFinal: { tails: ["s", "se"], keepAfter: ["i", "a"], keepBefore: ["t", "a", "o", "u"] },
        // ck only follows a short single vowel letter: not urck, eack.
        onlyAfterShortVowel: true,
      },
    ],
  },

  sonorityConstraints: {
    risingOnset: true,
    fallingCoda: true,
    minSonorityGap: 0,
    exempt: ["s", "z"],
  },

  morphology: {
    enabled: true,
    boundaryPolicy: {
      enablePrefixRootFallback: false,
      enableRootSuffixFallback: false,
      fallbackBridgeOnsets: defaultFallbackBridgeOnsets(),
    },
    morphophonemicPolicy: {
      preserveClusterLegality: true,
    },
    prefixes: withLexiconAffixFrequencies([
      { type: "prefix", written: "un", phonemes: ["ʌ", "n"], syllables: [{ onset: [], nucleus: ["ʌ"], coda: ["n"] }], syllableCount: 1, stressEffect: "secondary", frequency: 80 },
      { type: "prefix", written: "re", phonemes: ["r", "ɪ"], syllables: [{ onset: ["r"], nucleus: ["ɪ"], coda: [] }], syllableCount: 1, stressEffect: "secondary", frequency: 70 },
      { type: "prefix", written: "dis", phonemes: ["d", "ɪ", "s"], syllables: [{ onset: ["d"], nucleus: ["ɪ"], coda: ["s"] }], syllableCount: 1, stressEffect: "secondary", frequency: 18 },
      { type: "prefix", written: "pre", phonemes: ["p", "r", "i:"], syllables: [{ onset: ["p", "r"], nucleus: ["i:"], coda: [] }], syllableCount: 1, stressEffect: "secondary", frequency: 18 },
      { type: "prefix", written: "over", phonemes: ["əʊ", "v", "ɚ"], syllables: [{ onset: [], nucleus: ["əʊ"], coda: [] }, { onset: ["v"], nucleus: ["ɚ"], coda: [] }], syllableCount: 2, stressEffect: "primary", frequency: 20 },
      { type: "prefix", written: "out", phonemes: ["aʊ", "t"], syllables: [{ onset: [], nucleus: ["aʊ"], coda: ["t"] }], syllableCount: 1, stressEffect: "primary", frequency: 20 },
      { type: "prefix", written: "mis", phonemes: ["m", "ɪ", "s"], syllables: [{ onset: ["m"], nucleus: ["ɪ"], coda: ["s"] }], syllableCount: 1, stressEffect: "secondary", frequency: 30 },
      { type: "prefix", written: "in", phonemes: ["ɪ", "n"], syllables: [{ onset: [], nucleus: ["ɪ"], coda: ["n"] }], syllableCount: 1, stressEffect: "secondary", frequency: 50, allomorphs: [{ phonologicalCondition: { position: "following", place: ["bilabial"] }, phonemes: ["ɪ", "m"], syllables: [{ onset: [], nucleus: ["ɪ"], coda: ["m"] }], syllableCount: 1, written: "im" }] },
    ]),
    suffixes: withLexiconAffixFrequencies([
      // Base frequencies are the legacy text profile; lexicon uses stripped counts.
      // y→i applies to every suffix that does not begin with `i` (#458).
      // i-initial suffixes (`-ing`, `-ist`, `-ism`, `-ive`, `-ity`, `-ize`, `-ian`, `-ial`) keep final y.
      { type: "suffix", written: "ing", phonemes: ["ɪ", "ŋ"], syllables: [{ onset: [], nucleus: ["ɪ"], coda: ["ŋ"] }], syllableCount: 1, stressEffect: "none", frequency: 40, boundaryTransforms: BT_E_DOUBLE },
      { type: "suffix", written: "tion", phonemes: ["ʃ", "ə", "n"], syllables: [{ onset: ["ʃ"], nucleus: ["ə"], coda: ["n"] }], syllableCount: 1, stressEffect: "attract-preceding", frequency: 28, boundaryTransforms: btYJoin("tion") },
      { type: "suffix", written: "sion", phonemes: ["ʃ", "ə", "n"], syllables: [{ onset: ["ʃ"], nucleus: ["ə"], coda: ["n"] }], syllableCount: 1, stressEffect: "attract-preceding", frequency: 10, boundaryTransforms: btYJoin("sion") },
      { type: "suffix", written: "ly", phonemes: ["l", "i:"], syllables: [{ onset: ["l"], nucleus: ["i:"], coda: [] }], syllableCount: 1, stressEffect: "none", frequency: 30, boundaryTransforms: btYJoin("ly") },
      {
        type: "suffix", written: "ed", phonemes: ["d"], syllables: [], syllableCount: 0, stressEffect: "none", frequency: 120,
        boundaryTransforms: BT_Y_E_DOUBLE,
        allomorphs: [
          { phonologicalCondition: { position: "preceding", voiced: false }, phonemes: ["t"], syllables: [], syllableCount: 0 },
          { phonologicalCondition: { position: "preceding", voiced: true }, phonemes: ["d"], syllables: [], syllableCount: 0 },
          { phonologicalCondition: { position: "preceding", manner: ["stop"], place: ["alveolar"] }, phonemes: ["ɪ", "d"], syllables: [{ onset: [], nucleus: ["ɪ"], coda: ["d"] }], syllableCount: 1, written: "ed" },
        ],
      },
      { type: "suffix", written: "ness", phonemes: ["n", "ə", "s"], syllables: [{ onset: ["n"], nucleus: ["ə"], coda: ["s"] }], syllableCount: 1, stressEffect: "none", frequency: 6, boundaryTransforms: btYJoin("ness") },
      // Note: -er frequency to be re-evaluated after PR #234 (phoneme onset weights) merges,
      // as base-gen /ɚ/ final-syllable rate will increase.
      { type: "suffix", written: "er", phonemes: ["ɚ"], syllables: [{ onset: [], nucleus: ["ɚ"], coda: [] }], syllableCount: 1, stressEffect: "none", frequency: 50, boundaryTransforms: BT_Y_E_DOUBLE },
      { type: "suffix", written: "est", phonemes: ["ɪ", "s", "t"], syllables: [{ onset: [], nucleus: ["ɪ"], coda: ["s", "t"] }], syllableCount: 1, stressEffect: "none", frequency: 15, boundaryTransforms: BT_Y_E_DOUBLE },
      { type: "suffix", written: "ment", phonemes: ["m", "ə", "n", "t"], syllables: [{ onset: ["m"], nucleus: ["ə"], coda: ["n", "t"] }], syllableCount: 1, stressEffect: "none", frequency: 23, boundaryTransforms: btYJoin("ment") },
      { type: "suffix", written: "able", phonemes: ["ə", "b", "ə", "l"], syllables: [{ onset: [], nucleus: ["ə"], coda: [] }, { onset: ["b"], nucleus: ["ə"], coda: ["l"] }], syllableCount: 2, stressEffect: "none", frequency: 21, boundaryTransforms: BT_ALL },
      { type: "suffix", written: "ful", phonemes: ["f", "ə", "l"], syllables: [{ onset: ["f"], nucleus: ["ə"], coda: ["l"] }], syllableCount: 1, stressEffect: "none", frequency: 15, boundaryTransforms: btYJoin("ful") },
      { type: "suffix", written: "less", phonemes: ["l", "ə", "s"], syllables: [{ onset: ["l"], nucleus: ["ə"], coda: ["s"] }], syllableCount: 1, stressEffect: "none", frequency: 12, boundaryTransforms: btYJoin("less") },
      { type: "suffix", written: "ous", phonemes: ["ə", "s"], syllables: [{ onset: [], nucleus: ["ə"], coda: ["s"] }], syllableCount: 1, stressEffect: "attract-preceding", frequency: 14, boundaryTransforms: BT_Y_E },
      { type: "suffix", written: "ive", phonemes: ["ɪ", "v"], syllables: [{ onset: [], nucleus: ["ɪ"], coda: ["v"] }], syllableCount: 1, stressEffect: "attract-preceding", frequency: 12, boundaryTransforms: BT_E },
      { type: "suffix", written: "al", phonemes: ["ə", "l"], syllables: [{ onset: [], nucleus: ["ə"], coda: ["l"] }], syllableCount: 1, stressEffect: "attract-preceding", frequency: 46, boundaryTransforms: BT_Y_E },
      {
        type: "suffix",
        written: "ity",
        phonemes: ["ɪ", "t", "i:"],
        syllables: [{ onset: [], nucleus: ["ɪ"], coda: [] }, { onset: ["t"], nucleus: ["i:"], coda: [] }],
        syllableCount: 2,
        stressEffect: "attract-preceding",
        frequency: 18,
        boundaryTransforms: BT_E,
        // electric → electricity style softening and divine → divinity style flattening.
        morphophonemicRules: [
          {
            name: "ity-velar-softening",
            priority: 10,
            phonologicalCondition: { position: "preceding", voiced: false, manner: ["stop"], place: ["velar"] },
            replaceSound: "s",
            writtenMatch: /(c|k|ck)$/i,
            writtenReplace: "s",
          },
          {
            name: "ity-diphthong-flattening",
            target: "nucleus",
            priority: 20,
            // TODO(issue-15): Restrict this rule to aligned orthographic contexts
            // (e.g., ...ine -> ...in) so phoneme flattening does not over-apply.
            phonologicalCondition: { position: "preceding", sounds: ["aɪ"] },
            replaceSound: "ɪ",
            writtenMatch: /ine$/i,
            writtenReplace: "in",
          },
        ],
      },
      {
        type: "suffix", written: "s", phonemes: ["z"], syllables: [], syllableCount: 0, stressEffect: "none", frequency: 190,
        boundaryTransforms: BT_S,
        allomorphs: [
          { phonologicalCondition: { position: "preceding", voiced: false }, phonemes: ["s"], syllables: [], syllableCount: 0 },
          { phonologicalCondition: { position: "preceding", voiced: true }, phonemes: ["z"], syllables: [], syllableCount: 0 },
          { phonologicalCondition: { position: "preceding", manner: ["sibilant", "affricate"] }, phonemes: ["ɪ", "z"], syllables: [{ onset: [], nucleus: ["ɪ"], coda: ["z"] }], syllableCount: 1, written: "es" },
        ],
      },
      // New suffixes — absent from original config but well-represented in CMU dictionary
      { type: "suffix", written: "ist", phonemes: ["ɪ", "s", "t"], syllables: [{ onset: [], nucleus: ["ɪ"], coda: ["s", "t"] }], syllableCount: 1, stressEffect: "none", frequency: 5, boundaryTransforms: BT_E },
      { type: "suffix", written: "ize", phonemes: ["aɪ", "z"], syllables: [{ onset: [], nucleus: ["aɪ"], coda: ["z"] }], syllableCount: 1, stressEffect: "none", frequency: 8, boundaryTransforms: BT_E },
      { type: "suffix", written: "ism", phonemes: ["ɪ", "z", "ə", "m"], syllables: [{ onset: [], nucleus: ["ɪ"], coda: ["z"] }, { onset: [], nucleus: ["ə"], coda: ["m"] }], syllableCount: 2, stressEffect: "none", frequency: 3, boundaryTransforms: BT_E },
      // Nominal derivational suffixes — well-represented in CMU but missing from original config
      { type: "suffix", written: "ary", phonemes: ["ɛ", "r", "i:"], syllables: [{ onset: [], nucleus: ["ɛ"], coda: ["r"] }, { onset: [], nucleus: ["i:"], coda: [] }], syllableCount: 2, stressEffect: "attract-preceding", frequency: 20, boundaryTransforms: BT_Y_E },
      { type: "suffix", written: "ory", phonemes: ["ɔ", "r", "i:"], syllables: [{ onset: [], nucleus: ["ɔ"], coda: ["r"] }, { onset: [], nucleus: ["i:"], coda: [] }], syllableCount: 2, stressEffect: "attract-preceding", frequency: 15, boundaryTransforms: BT_Y_E },
      { type: "suffix", written: "ery", phonemes: ["ɛ", "r", "i:"], syllables: [{ onset: [], nucleus: ["ɛ"], coda: ["r"] }, { onset: [], nucleus: ["i:"], coda: [] }], syllableCount: 2, stressEffect: "none", frequency: 8, boundaryTransforms: BT_Y_E },
      { type: "suffix", written: "ian", phonemes: ["i:", "ə", "n"], syllables: [{ onset: [], nucleus: ["i:"], coda: [] }, { onset: [], nucleus: ["ə"], coda: ["n"] }], syllableCount: 2, stressEffect: "attract-preceding", frequency: 8, boundaryTransforms: BT_E },
      { type: "suffix", written: "ial", phonemes: ["i:", "ə", "l"], syllables: [{ onset: [], nucleus: ["i:"], coda: [] }, { onset: [], nucleus: ["ə"], coda: ["l"] }], syllableCount: 2, stressEffect: "attract-preceding", frequency: 8, boundaryTransforms: BT_E },
    ]),
    templateWeights: {
      text: { bare: 55, suffixed: 30, prefixed: 10, both: 5 },
      lexicon: {
        ...lexiconTemplates,
        byRootSyllables: lexiconReference.templates,
      },
    },
  },

  clusterWeights: {
    onset: {
      // /dr/ onset cluster is ~2.5× over-represented vs CMU; reduce probability.
      // CMU has tr 3× more common than dr — our generator produces them equally.
      // "d" suppresses /d/ as the INITIATING consonant of a 2-consonant onset cluster
      // (requires the cluster.length===0 && maxLength>=2 path in selectPhoneme).
      // "d,r" keeps the existing multiplier for the second slot (belt-and-suspenders).
      "d": 0.38,
      "d,r": 0.38,
    },
    coda: {
      final: {
        "t,s": 0.12,      // Relaxed from near-zero to recover under-represented codas
        "t,z": 0.12,
        "n,s": 0.12,
        "n,z": 0.12,
        "d,s": 0.06,
        "d,z": 0.06,
        "b,s": 0.0001,    // Also block after nasalStopExtension (m→mb+s)
        "b,z": 0.0001,
        "g,s": 0.0001,    // Also block after nasalStopExtension (ŋ→ŋg+s)
        "g,z": 0.0001,
      },
      nonFinal: {
        "t,s": 0.75,    // Loosened to improve CMU alignment for common sequences
        "t,z": 0.75,
        "n,s": 0.75,
        "n,z": 0.75,
        "d,s": 0.35,
        "d,z": 0.35,
        "b,s": 0.4,
        "b,z": 0.4,
        "g,s": 0.4,
        "g,z": 0.4,
      },
    },
  },
};

if (measuredAffixes.size > 0) {
  throw new Error(`Unknown measured lexicon affixes: ${[...measuredAffixes].join(", ")}`);
}
