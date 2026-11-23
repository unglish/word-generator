/** Affricate graphemes: /tʃ/ (ch), /dʒ/ (j). */
import { Grapheme } from "../../types.js";
import { FULL_SHORT_NUCLEI } from "../phonemes.js";

const shortAffricateVowels = [...FULL_SHORT_NUCLEI, "ə", "ɚ"];

// Each contextual alternative occupies the same low-weight medial coda slot.
const medialCodaAffricate = {
  phoneme: "dʒ",
  frequency: 1,
  onset: 0,
  startWord: 0,
  midWord: 1,
  endWord: 0,
};

export const affricateGraphemes: Grapheme[] = [
  // cheese
  {
    phoneme: "tʃ",
    form: "ch",
    frequency: 140,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "tʃ",
    form: "tch",
    frequency: 30,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
    condition: { leftContext: ["lax-vowel"] },
  },
  {
    phoneme: "tʃ",
    form: "tu",
    frequency: 1,
    coda: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  // righteous
  {
    phoneme: "tʃ",
    form: "te",
    frequency: 1,
    coda: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },

  // d�� judge
  {
    phoneme: "dʒ",
    form: "g",
    frequency: 15,
    coda: 0,
    startWord: 1,
    midWord: 1,
    endWord: 0,
    condition: { rightContext: ["front-vowel"] },
  },
  {
    phoneme: "dʒ",
    form: "j",
    frequency: 20,
    coda: 0,
    cluster: 0,
    startWord: 1,
    midWord: 1,
    endWord: 0,
  },
  {
    phoneme: "dʒ",
    form: "ge",
    frequency: 6,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1, // age: final ge is licensed after tense as well as lax vowels.
  },
  {
    phoneme: "dʒ",
    form: "dge",
    frequency: 10,
    onset: 0,
    startWord: 0,
    midWord: 1,
    endWord: 1,
    condition: { leftContext: ["lax-vowel"] },
  },
  {
    ...medialCodaAffricate,
    form: "di", // soldier, cordial
    condition: { rightContext: ["vowel"], notRightContext: ["front-vowel", "back-vowel"] },
  },
  {
    ...medialCodaAffricate,
    form: "dg", // judgment, fledgling
    condition: { leftContext: shortAffricateVowels, rightContext: ["consonant"], notRightContext: ["g", "j"] },
  },
  {
    ...medialCodaAffricate,
    form: "ge", // Keep the following hard g distinct at the same width as di.
    condition: { leftContext: shortAffricateVowels, rightContext: ["g"] },
  },
  {
    ...medialCodaAffricate,
    form: "ge", // pageboy
    condition: { notLeftContext: shortAffricateVowels, rightContext: ["consonant"], notRightContext: ["j", "w"] },
  },
  // The old iy-to-y and iw-to-w rewrites left one letter for the affricate.
  // Retain the original digraph's sampling weight with the one-letter form.
  {
    ...medialCodaAffricate,
    form: "j",
    discountAsMultigraph: true,
    condition: { rightContext: ["j"] },
  },
  {
    ...medialCodaAffricate,
    form: "j",
    discountAsMultigraph: true,
    condition: { notLeftContext: shortAffricateVowels, rightContext: ["w"] },
  },
];
