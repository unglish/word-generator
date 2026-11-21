/** Monophthong (pure vowel) graphemes: /iː/, /ɪ/, /ɛ/, /æ/, /ɑ/, /ɔ/, /ʊ/, /u/, /ʌ/, /ə/. */
import { Grapheme } from "../../types.js";

export const vowelGraphemes: Grapheme[] = [
  // i: sheep — comparator monos ≈ ee 40% / ea 40% / ie 10% / e 8%.
  // Without explicit iso weights, withPositions zeroes "ee" (startWord 0) so
  // monos were 100% "ea". Fit per-form shares; context split is coarse.
  {
    phoneme: "i:",
    form: "ee",
    frequency: 3,
    startWord: 0,
    midWord: 4,
    endWord: 1,
    isolatedSyllableWeight: 45,
  },
  {
    phoneme: "i:",
    form: "ea",
    frequency: 2,
    startWord: 20,
    midWord: 3,
    endWord: 1,
    isolatedSyllableWeight: 45,
    condition: { alias: "notBeforeVowelLetter" },
  },
  {
    phoneme: "i:",
    form: "e",
    frequency: 5,
    startWord: 100,
    midWord: 1,
    endWord: 0,
    // Bare "e" is mostly open/function words in comparator; keep mono share modest.
    isolatedSyllableWeight: 4,
  },
  {
    phoneme: "i:",
    form: "y",
    frequency: 3,
    startWord: 0,
    midWord: 0,
    endWord: 5,
    // Comparator open monos use "e"/"ee"/"ea", not final "y" (poly-final).
    isolatedSyllableWeight: 0,
    condition: {
      segmentPosition: ["final"],
      notRightContext: ["consonant"],
    },
  },
  {
    phoneme: "i:",
    form: "ie",
    frequency: 1,
    startWord: 0,
    midWord: 5,
    endWord: 2,
    isolatedSyllableWeight: 10,
  },
  {
    phoneme: "i:",
    form: "ei",
    frequency: 2,
    startWord: 10,
    midWord: 1,
    endWord: 0,
    isolatedSyllableWeight: 1,
  },
  // people
  {
    phoneme: "i:",
    form: "eo",
    frequency: 1, 
    startWord: 0,
    midWord: 1,
    endWord: 0,
    isolatedSyllableWeight: 0,
  },

  // ɪ: sit
  { 
    phoneme: "ɪ", 
    form: "i", 
    frequency: 1000,
    startWord: 5,
    midWord: 10,
    endWord: 1.0,
  },
  // Note: /ɪ/ before /ŋ/ already maps to "i" via the default entry above.
  // myth
  {
    phoneme: "ɪ",
    form: "y",
    frequency: 2,
    startWord: 0,
    midWord: 1,
    endWord: 0,
  },
  // build
  {
    phoneme: "ɪ",
    form: "ui",
    frequency: 1,
    startWord: 0,
    midWord: 1,
    endWord: 0,
  },

  // ɛ: let
  { 
    phoneme: "ɛ", 
    form: "e", 
    frequency: 100,
    startWord: 10,
    midWord: 10,
    endWord: 5,
    // Mono comparator ~74–81% single; keep "e" dominant on isolated syllables.
    isolatedSyllableWeight: 9,
  },
  // threat
  {
    phoneme: "ɛ",
    form: "ea",
    frequency: 140,
    onset: 0,
    startWord: 0,
    midWord: 10,
    endWord: 5,
    // Was unreachable on monos (hasBothEdges zeroed it). Target ~10–14% digraph.
    isolatedSyllableWeight: 1,
    condition: { alias: "notBeforeVowelLetter" },
  },
  // æ: cat
  { 
    phoneme: "æ", 
    form: "a", 
    frequency: 10,
    startWord: 10,
    midWord: 10,
    endWord: 5,
  },

  // ɑ: father
  { 
    phoneme: "ɑ", 
    form: "a", 
    frequency: 600,
    startWord: 10,
    midWord: 10,
    endWord: 5,
  },
  {
    phoneme: "ɑ",
    form: "o",
    frequency: 300,
    startWord: 10,
    midWord: 10,
    endWord: 5,
  },
  {
    phoneme: "ɑ",
    form: "ah",
    frequency: 10,
    startWord: 0,
    midWord: 5,
    endWord: 10,
  },
  {
    phoneme: "ɑ",
    form: "aa",
    frequency: 1,
    startWord: 1,
    midWord: 1,
    endWord: 0,
  },
  {
    phoneme: "ɑ",
    form: "au",
    frequency: 40,
    startWord: 1,
    midWord: 10,
    endWord: 10,
    condition: { wordFinal: false },
  },
  {
    phoneme: "ɑ",
    form: "aue",
    frequency: 40,
    startWord: 1,
    midWord: 10,
    endWord: 10,
  },

  // ɔ: ball
  {
    phoneme: "ɔ",
    form: "o",
    frequency: 10,
    startWord: 10,
    midWord: 10,
    endWord: 5,
    // Comparator ~52% "o". Digraph ceiling without inventory "au"/"oa" is aw+ough.
    isolatedSyllableWeight: 3,
  },
  // Open monos (law, saw): comparator open /ɔ/ is essentially all "aw".
  {
    phoneme: "ɔ",
    form: "aw",
    frequency: 1,
    onset: 0,
    startWord: 0,
    midWord: 1,
    endWord: 2,
    isolatedSyllableWeight: 50,
    condition: { syllableShape: { coda: "empty" } },
  },
  // Closed monos: comparator aw only before lone n/l/k (~0% clusters).
  // rightContext still allows nd/nk… — keep weight low so aw-before-cluster
  // stays rare: about 0.6% of /ɔ/ monos on average (test bound 1.6%; accepts
  // single-coda aw shortfall).
  {
    phoneme: "ɔ",
    form: "aw",
    frequency: 1,
    onset: 0,
    startWord: 0,
    midWord: 1,
    endWord: 2,
    isolatedSyllableWeight: 1,
    condition: {
      rightContext: ["n", "l", "k"],
      syllableShape: { coda: "nonEmpty" },
    },
  },
  {
    phoneme: "ɔ",
    form: "ough",
    frequency: 4,
    onset: 0,
    coda: 0,
    startWord: 0,
    midWord: 0,
    endWord: 5,
    isolatedSyllableWeight: 1,
    condition: { rightContext: ["t"] },
  },

  // book
  {
    phoneme: "ʊ",
    form: "oo",
    frequency: 80,
    onset: 0,
    startWord: 0,
    midWord: 5,
    endWord: 4,
    // Comparator ~66% digraph; restore mono licensing without overshooting ~80%+.
    isolatedSyllableWeight: 3,
  },
  { 
    phoneme: "ʊ", 
    form: "u", 
    frequency: 30,
    startWord: 1,
    midWord: 1,
    endWord: 1,
    isolatedSyllableWeight: 4,
    condition: { notLeftContext: ["g"] },
  },
  // could, would, should, courier
  {
    phoneme: "ʊ",
    form: "ou",
    frequency: 8,
    startWord: 0,
    midWord: 5,
    endWord: 0,
    isolatedSyllableWeight: 1,
  },

  // blue
  {
    phoneme: "u",
    form: "ou",
    frequency: 2,
    startWord: 0,
    midWord: 10,
    endWord: 0,
    isolatedSyllableWeight: 2,
  },
  {
    phoneme: "u",
    form: "oo",
    frequency: 30,
    startWord: 0,
    midWord: 3,
    endWord: 3,
    // Comparator ~50% "oo" / ~76% digraph overall.
    isolatedSyllableWeight: 4,
  },
  {
    phoneme: "u",
    form: "u",
    frequency: 10,
    startWord: 10,
    midWord: 10,
    endWord: 2,
    isolatedSyllableWeight: 3,
    condition: { notLeftContext: ["g"] },
  },
  // Open syllables (incl. open monos): comparator "ue" is open-only.
  {
    phoneme: "u",
    form: "ue",
    frequency: 10,
    startWord: 0,
    midWord: 5,
    endWord: 50,
    isolatedSyllableWeight: 3,
    condition: { syllableShape: { coda: "empty" } },
  },
  // Closed polysyllable positions — not licensed on monos (iso 0).
  {
    phoneme: "u",
    form: "ue",
    frequency: 10,
    startWord: 0,
    midWord: 5,
    endWord: 50,
    isolatedSyllableWeight: 0,
    condition: { syllableShape: { coda: "nonEmpty" } },
  },
  {
    phoneme: "u",
    form: "ew",
    frequency: 7,
    startWord: 1,
    midWord: 4,
    endWord: 20,
    isolatedSyllableWeight: 3,
    condition: { syllableShape: { coda: "empty" } },
  },
  // After /g/, closed first syllables of polysyllables need "ew" ( "u" is banned ).
  {
    phoneme: "u",
    form: "ew",
    frequency: 7,
    startWord: 1,
    midWord: 4,
    endWord: 20,
    isolatedSyllableWeight: 0,
    condition: { syllableShape: { coda: "nonEmpty" } },
  },

  // cup
  { 
    phoneme: "ʌ", 
    form: "u", 
    frequency: 1000,
    startWord: 1,
    midWord: 1,
    endWord: 0,
  },
  // son, come, love, money, month, front, other, mother
  {
    phoneme: "ʌ",
    form: "o",
    frequency: 300,
    startWord: 3,
    midWord: 8,
    endWord: 1,
  },
  { 
    phoneme: "ʌ", 
    form: "uh", 
    frequency: 3,
    startWord: 1,
    midWord: 4,
    endWord: 1,
  },

  // the
  { 
    phoneme: "ə", 
    form: "e", 
    frequency: 150,
    startWord: 5,
    midWord: 10,
    endWord: 1,
  },
  // Note: "i" before /ŋ/ handled via spelling rule (eng→ing) rather than
  // grapheme condition, since the nucleus can span diphthong + schwa
  // across syllables.
  { 
    phoneme: "ə", 
    form: "a", 
    frequency: 300,
    startWord: 1000, 
    midWord: 5, 
    endWord: 9,
  },
  { 
    phoneme: "ə", 
    form: "o", 
    frequency: 200,
    startWord: 1, 
    midWord: 5, 
    endWord: 1,
  },
  { 
    phoneme: "ə", 
    form: "ou", 
    frequency: 1,
    startWord: 1, 
    midWord: 1, 
    endWord: 1,
  },
  { 
    phoneme: "ə", 
    form: "u", 
    frequency: 50,
    startWord: 5, 
    midWord: 10, 
    endWord: 0,
  },
  { 
    phoneme: "ə", 
    form: "i", 
    frequency: 220,
    startWord: 1, 
    midWord: 10, 
    endWord: 0,
  },
];
