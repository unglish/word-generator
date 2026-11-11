/** Affricate graphemes: /tʃ/ (ch), /dʒ/ (j). */
import { Grapheme } from "../../types.js";

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
    phoneme: "dʒ",
    form: "di",
    frequency: 1,
    onset: 0,
    startWord: 0,
    midWord: 1,
    endWord: 0,
    condition: { notRightContext: ["front-vowel", "back-vowel"] },
  },
];
