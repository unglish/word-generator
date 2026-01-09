/**
 * Nasal graphemes.
 * 
 * Nasals are sounds produced with airflow through the nose:
 * - m (mom, ham)
 * - n (no, run)
 * - ŋ (sing, ring)
 */

import { Grapheme } from "../../types.js";

export const nasalGraphemes: Grapheme[] = [
  // m: mom
  {
    phoneme: "m",
    form: "m",
    origin: 3,
    frequency: 1000,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "m",
    form: "mb",
    origin: 5,
    frequency: 2,
    onset: 0,
    cluster: 0,
    startWord: 0,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "m",
    form: "mn",
    origin: 2,
    frequency: 1,
    onset: 0,
    cluster: 0,
    startWord: 0,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "m",
    form: "lm",
    origin: 3,
    frequency: 2,
    onset: 0,
    startWord: 0,
    midWord: 1,
    endWord: 1,
  },

  // n: no
  {
    phoneme: "n",
    form: "n",
    origin: 3,
    frequency: 1000,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "n",
    form: "mn",
    origin: 2,
    frequency: 1,
    coda: 0,
    cluster: 0,
    startWord: 1,
    midWord: 0,
    endWord: 0,
  },
  {
    phoneme: "n",
    form: "kn",
    origin: 0,
    frequency: 10,
    coda: 0,
    cluster: 0,
    startWord: 1,
    midWord: 1,
    endWord: 0,
  },
  {
    phoneme: "n",
    form: "gn",
    origin: 0,
    frequency: 5,
    cluster: 0,
    startWord: 0,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "n",
    form: "pn",
    origin: 2,
    frequency: 1,
    coda: 0,
    startWord: 1,
    midWord: 0,
    endWord: 0,
  },

  // ŋ: sing
  {
    phoneme: "ŋ",
    form: "ng",
    origin: 0,
    frequency: 10,
    onset: 0,
    cluster: 0,
    startWord: 0,
    midWord: 1,
    endWord: 1,
  },
];
