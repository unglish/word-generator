/** Diphthong graphemes: /aɪ/, /aʊ/, /ɔɪ/, /eɪ/, /əʊ/. */
import { Grapheme } from "../../types.js";
import { DIGRAPH_CONSONANTS, openReading } from "./open-reading.js";

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
    // Closed "i" reads /ɪ/ (liskicky, #470) except before nd/ld/nt (kind,
    // wild, pint) or a consonant a reader moves onto a following vowel.
    // English has no /aɪŋ/ spelling; its alternative "ie" becomes "iing"
    // through eng-to-ing, so "i" stays before /ŋ/ (+s/z), in any syllable.
    condition: {
      openReading: openReading(["n", "d"], ["l", "d"], ["n", "t"], ["ŋ"], ["ŋ", "s"], ["ŋ", "z"]),
    },
  },
  // Before other clusters and digraph codas English has no spelling that
  // reads /aɪ/ (#470): ie reads /i:/ there (fiechloties, as in field), and
  // only final igh before /t/ works (nights). Keep the bare letter for those.
  {
    phoneme: "aɪ",
    form: "i",
    frequency: 10,
    startWord: 1,
    midWord: 10,
    endWord: 10,
    isolatedSyllableWeight: 5,
    fallbackOnly: true,
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
  // English writes ie for /aɪ/ only after a consonant (pie, tried). Without an
  // onset it surfaces as a word-initial or hiatus "ie" (#472: iesitur,
  // iniesewnly), so it needs one.
  {
    phoneme: "aɪ",
    form: "ie",
    frequency: 1,
    startWord: 10,
    midWord: 10,
    endWord: 1,
    isolatedSyllableWeight: 2,
    condition: { syllableShape: { onset: "nonEmpty", coda: "empty" } },
  },
  // Closed ie is only legible where magic-e splits it: before one coda
  // consonant (ice, ire; lisekicky). Magic-e cannot split a digraph coda
  // (ieshoor), so the consonants always spelled with two letters are
  // excluded; before a cluster ie reads /i:/ (fiends; #470 fiechloties).
  {
    phoneme: "aɪ",
    form: "ie",
    frequency: 1,
    startWord: 10,
    midWord: 10,
    endWord: 1,
    isolatedSyllableWeight: 2,
    // Not before /g/ either: the split "ige" reads /aɪdʒ/ (pigevanting).
    condition: {
      syllableShape: { onset: "nonEmpty", coda: 1 },
      notRightContext: [...DIGRAPH_CONSONANTS, "g"],
    },
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
    // Closed "ai" reads /eɪ/ (paint); since #470 it would take closed /aɪ/.
    condition: { syllableShape: { coda: "empty" } },
  },
  {
    phoneme: "aɪ",
    form: "is",
    frequency: 1,
    startWord: 1,
    midWord: 0,
    endWord: 0,
    // English writes /aɪ/ as "is" only for an onsetless /aɪ/ before /l/ (isle,
    // island). Without this, onsetless /aɪ/ moved from ie to is (israke,
    // isptifcab; #472); after an onset it reads /ɪs/ (lisltig). Before an
    // onset /l/ only (is-land): once closed /aɪ/ lost bare i (#470), a coda /l/
    // took is (islkane, islpearmer).
    condition: { rightContext: ["l"], syllableShape: { onset: "empty", coda: "empty" } },
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
    // 1, not 2 (#472): with onsetless ie gone, 2 raised word-initial onsetless
    // /aɪ/ eye from 6.8% to 14.8% (eyetornful); CMU has about 6.6%, all from
    // the word eye.
    startWord: 1,
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
    // English writes /aʊ/ before /t/ as ou (out, doubt, shout), almost never
    // ow (#473: razowtity). ow stays before n, l, d, z and vowels (town, owl,
    // crowd, browse, tower).
    condition: { notRightContext: ["t"] },
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
    // Open-syllable only (#473), as for ay/ey (#459): English writes oy at word
    // end or before a vowel or suffix (boy, royal, toys), and oi before a coda
    // (point, moist), not udoyts.
    condition: { syllableShape: { coda: "empty" } },
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
    // Closed "a" reads /æ/ (kalmrel, #470) except before /dʒ/, whose "ge"
    // supplies the split marker (age, change), or a consonant a reader moves
    // onto a following vowel.
    condition: { openReading: openReading(["dʒ"], ["n", "dʒ"]) },
  },
  // Closed poly-final /eɪ/ after #459: ay/ey no longer cover coda finals.
  // "ae" + one coda consonant is split by the magic-e rule (pae+n → pane); a
  // bare "a" would read as /æ/ (bepan). Magic-e cannot split a cluster
  // (dirtaets), so clusters fall to "ai" (paint).
  {
    phoneme: "eɪ",
    form: "ae",
    frequency: 25,
    startWord: 0,
    midWord: 0,
    endWord: 4,
    isolatedSyllableWeight: 0,
    condition: { syllableShape: { coda: 1 } },
  },
  {
    phoneme: "eɪ",
    form: "ai",
    frequency: 10,
    coda: 0,
    startWord: 0,
    midWord: 2,
    endWord: 2,
    // endWord (#459) takes closed finals that ay/ey no longer cover (paint).
    // No coda condition: open isolated "ai" is how monosyllables get "ay"
    // (flai → flay via no-final-i), since isolated ay/ey weights are 0.
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
    // Open-syllable only (#459): English writes ay at word end (day, play) or
    // before a suffix (plays), not before a same-syllable coda (bepayn).
    // Root coda /s|/z/ is also banned — still root-internal, even if plural-like.
    // Ban on monos via isolated 0 (known open-ay mono gap).
    isolatedSyllableWeight: 0,
    condition: { syllableShape: { coda: "empty" } },
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
    // Same open-syllable restriction as "ay" (#459). Ban on monos (known open-ey gap).
    isolatedSyllableWeight: 0,
    condition: { syllableShape: { coda: "empty" } },
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
  // Medial closed /əʊ/ (non-n/l): without a midWord "o", the pool is only
  // "ou" once "ow" is restricted — "out"-like spellings. Closed-only so open
  // medial "ow" (and mono isolated "o") stay as before.
  {
    phoneme: "əʊ",
    form: "o",
    frequency: 500,
    startWord: 0,
    midWord: 1,
    endWord: 0,
    isolatedSyllableWeight: 0,
    condition: { syllableShape: { coda: "nonEmpty" } },
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
