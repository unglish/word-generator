/** Diphthong graphemes: /aɪ/, /aʊ/, /ɔɪ/, /eɪ/, /əʊ/. */
import { Grapheme } from "../../types.js";

export const diphthongGraphemes: Grapheme[] = [
  // my
  { 
    phoneme: "aɪ", 
    form: "i", 
    frequency: 10,
    startWord: 1,
    midWord: 10,
    endWord: 10,
    // Comparator ~19–20% bare / ~63% split — prefer silentE from "i".
    isolatedSyllableWeight: 5,
  },
  {
    phoneme: "aɪ",
    form: "igh",
    frequency: 12,
    onset: 0,
    coda: 0,
    startWord: 0,
    midWord: 0,
    endWord: 10,
    isolatedSyllableWeight: 3,
    condition: { rightContext: ["t"] },
  },
  { 
    phoneme: "aɪ", 
    form: "y", 
    frequency: 3,
    startWord: 0,
    midWord: 2,
    endWord: 5,
    isolatedSyllableWeight: 3,
    condition: {
      notRightContext: ["consonant"],
    },
  },
  {
    phoneme: "aɪ",
    form: "ie",
    frequency: 1,
    startWord: 10,
    midWord: 10,
    endWord: 1,
    isolatedSyllableWeight: 2,
  },
  { 
    phoneme: "aɪ", 
    form: "ai", 
    frequency: 1,
    startWord: 0,
    midWord: 1,
    endWord: 0,
    // Review: no mono /aɪ/ "ai" licensing (comparator has 0).
    isolatedSyllableWeight: 0,
  },
  {
    phoneme: "aɪ",
    form: "is",
    frequency: 1,
    startWord: 1,
    midWord: 0,
    endWord: 0,
  },
  {
    phoneme: "aɪ",
    form: "ye",
    frequency: 10,
    onset: 0,
    startWord: 0,
    midWord: 1,
    endWord: 2,
    // Comparator ye is open-only (~1.7% of /aɪ/).
    isolatedSyllableWeight: 1,
    condition: { syllableShape: { coda: "empty" } },
  },
  {
    phoneme: "aɪ",
    form: "eye",
    frequency: 1,
    onset: 0,
    coda: 0,
    startWord: 2,
    midWord: 0,
    endWord: 3,
    condition: { alias: "bareSyllableNucleus" },
  },

  // now
  {
    phoneme: "aʊ",
    form: "ow",
    frequency: 45,
    startWord: 1,
    midWord: 5,
    endWord: 10,
  },
  {
    phoneme: "aʊ",
    form: "ou",
    frequency: 55,
    coda: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },

  // coin
  {
    phoneme: "ɔɪ",
    form: "oi",
    frequency: 10,
    coda: 0,
    startWord: 5,
    midWord: 10,
    endWord: 1,
  },
  {
    phoneme: "ɔɪ",
    form: "oy",
    frequency: 2,
    onset: 0,
    startWord: 0,
    midWord: 5,
    endWord: 20,
  },

  // day
  { 
    phoneme: "eɪ", 
    form: "a", 
    frequency: 25,
    startWord: 10,
    midWord: 0,
    endWord: 0,
    // Comparator ~56% "a" (mostly split via silentE); keep mono path for magic-e.
    isolatedSyllableWeight: 3,
  },
  {
    phoneme: "eɪ",
    form: "ai",
    frequency: 10,
    coda: 0,
    startWord: 0,
    midWord: 2,
    endWord: 0,
    // Comparator ~24% "ai", closed-only (coda:0 already).
    isolatedSyllableWeight: 5,
  },
  {
    phoneme: "eɪ",
    form: "ay",
    frequency: 7,
    onset: 0,
    startWord: 0,
    midWord: 1,
    endWord: 5,
    // Comparator ay is open-only on monos, but syllableShape coda:empty also
    // removes the only endWord>0 spellings for closed final syllables of
    // polysyllables. Ban on monos; keep poly endWord. Known mono open-ay gap.
    isolatedSyllableWeight: 0,
  },
  {
    phoneme: "eɪ",
    form: "eigh",
    frequency: 1,
    onset: 0,
    startWord: 0,
    midWord: 4,
    endWord: 10,
    isolatedSyllableWeight: 1,
    condition: { rightContext: ["t"] },
  },
  // great
  {
    phoneme: "eɪ",
    form: "ea",
    frequency: 2,
    startWord: 0,
    midWord: 1,
    endWord: 0,
    isolatedSyllableWeight: 1,
    condition: { alias: "notBeforeVowelLetter" },
  },
  {
    phoneme: "eɪ",
    form: "ey",
    frequency: 5,
    startWord: 0,
    midWord: 0,
    endWord: 4,
    // Same poly-final dependency as "ay" — ban on monos (known open-ey gap).
    isolatedSyllableWeight: 0,
  },
  { 
    phoneme: "eɪ", 
    form: "ae", 
    frequency: 2,
    startWord: 1,
    midWord: 1,
    endWord: 0,
    isolatedSyllableWeight: 1,
  },

  // blow — comparator ow is ~12% of /əʊ/: open-heavy, rare single coda (n/l),
  // never clusters. Fit open and single separately; accept digraph shortfall
  // from missing inventory "oa" (~19% comparator).
  {
    phoneme: "əʊ",
    form: "ow",
    frequency: 250,
    startWord: 1,
    midWord: 1,
    endWord: 1,
    isolatedSyllableWeight: 9,
    condition: { syllableShape: { coda: "empty" } },
  },
  {
    phoneme: "əʊ",
    form: "ow",
    frequency: 250,
    startWord: 1,
    midWord: 1,
    endWord: 1,
    // Comparator single-coda ow is almost only before n/l (own, bowl).
    // rightContext still admits nd/nk… — keep weight low so cluster surface
    // (and ow-cluster-simplify → ou) stays near comparator 0%.
    isolatedSyllableWeight: 2,
    condition: {
      rightContext: ["n", "l"],
      syllableShape: { coda: "nonEmpty" },
    },
  },
  {
    phoneme: "əʊ",
    form: "o",
    frequency: 500,
    startWord: 1,
    midWord: 0,
    endWord: 5,
    isolatedSyllableWeight: 8,
  },
  {
    phoneme: "əʊ",
    form: "ou",
    frequency: 10,
    startWord: 0,
    midWord: 1,
    endWord: 0,
    isolatedSyllableWeight: 1,
  },
  {
    phoneme: "əʊ",
    form: "oe",
    frequency: 10,
    startWord: 1,
    midWord: 1,
    endWord: 1,
    // Comparator oe mostly open; ban closed leak.
    isolatedSyllableWeight: 1,
    condition: { syllableShape: { coda: "empty" } },
  },
  {
    phoneme: "əʊ",
    form: "ough",
    frequency: 1,
    onset: 0,
    startWord: 0,
    midWord: 0,
    endWord: 0,
  },
];
