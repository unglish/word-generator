/**
 * Affricate graphemes.
 * 
 * Affricates are consonants that begin as stops and release as fricatives:
 * - tʃ (cheese, church)
 * - dʒ (judge, bridge)
 */

import { Grapheme } from "../../types.js";

export const affricateGraphemes: Grapheme[] = [
  // tʃ: cheese
  {
    phoneme: "tʃ",
    form: "ch",
    origin: 3,
    frequency: 100,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "tʃ",
    form: "tch",
    origin: 0,
    frequency: 100,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "tʃ",
    form: "tu",
    origin: 3,
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
    origin: 3,
    frequency: 1,
    coda: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },

  // dʒ: judge
  {
    phoneme: "dʒ",
    form: "g",
    origin: 3,
    frequency: 2,
    coda: 0,
    startWord: 1,
    midWord: 1,
    endWord: 0,
  },
  {
    phoneme: "dʒ",
    form: "j",
    origin: 3,
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
    origin: 3,
    frequency: 6,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 0,
  },
  {
    phoneme: "dʒ",
    form: "dge",
    origin: 3,
    frequency: 10,
    onset: 0,
    startWord: 0,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "dʒ",
    form: "di",
    origin: 3,
    frequency: 1,
    onset: 0,
    startWord: 0,
    midWord: 1,
    endWord: 0,
  },
  {
    phoneme: "dʒ",
    form: "gg",
    origin: 3,
    frequency: 1,
    onset: 0,
    startWord: 0,
    midWord: 1,
    endWord: 0,
  },
];
