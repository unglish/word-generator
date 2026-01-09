/**
 * Stop (plosive) graphemes.
 * 
 * Stops are consonants produced by completely blocking airflow:
 * - p (pig), b (boy)
 * - t (top), d (dog)
 * - k (cat), g (go)
 */

import { Grapheme } from "../../types.js";

export const stopGraphemes: Grapheme[] = [
  // p: pig
  {
    phoneme: "p",
    form: "p",
    origin: 3,
    frequency: 50,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },

  // b: boy
  {
    phoneme: "b",
    form: "b",
    origin: 3,
    frequency: 100,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "b",
    form: "pb",
    origin: 3,
    frequency: 1,
    onset: 0,
    cluster: 0,
    startWord: 0,
    midWord: 1,
    endWord: 0,
  },

  // t: top
  {
    phoneme: "t",
    form: "t",
    origin: 3,
    frequency: 2500,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "t",
    form: "th",
    origin: 2,
    frequency: 1,
    coda: 0,
    cluster: 0,
    startWord: 0,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "t",
    form: "bt",
    origin: 3,
    frequency: 1,
    onset: 0,
    cluster: 0,
    startWord: 0,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "t",
    form: "ed",
    origin: 3,
    frequency: 2,
    onset: 0,
    startWord: 0,
    midWord: 0,
    endWord: 1,
  },

  // d: dog
  {
    phoneme: "d",
    form: "d",
    origin: 3,
    frequency: 300,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "d",
    form: "ed",
    origin: 3,
    frequency: 6,
    onset: 0,
    cluster: 300,
    startWord: 0,
    midWord: 0,
    endWord: 1,
  },

  // k: cat
  {
    phoneme: "k",
    form: "k",
    origin: 3,
    frequency: 50,
    startWord: 1,
    midWord: 1,
    endWord: 10,
  },
  {
    phoneme: "k",
    form: "c",
    origin: 3,
    frequency: 20,
    cluster: 100,
    startWord: 1,
    midWord: 1,
    endWord: 0,
  },
  {
    phoneme: "k",
    form: "ck",
    origin: 3,
    frequency: 100,
    onset: 0,
    startWord: 0,
    midWord: 1,
    endWord: 10,
  },
  {
    phoneme: "k",
    form: "ch",
    origin: 3,
    frequency: 2,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "k",
    form: "lk",
    origin: 3,
    frequency: 4,
    onset: 0,
    startWord: 0,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "k",
    form: "q",
    origin: 3,
    frequency: 1,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },

  // g: go
  {
    phoneme: "g",
    form: "g",
    origin: 3,
    frequency: 100,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "g",
    form: "gh",
    origin: 3,
    frequency: 2,
    coda: 0,
    cluster: 0,
    startWord: 1,
    midWord: 0,
    endWord: 0,
  },
  {
    phoneme: "g",
    form: "gu",
    origin: 3,
    frequency: 1,
    coda: 0,
    startWord: 1,
    midWord: 1,
    endWord: 0,
  },
  {
    phoneme: "g",
    form: "gue",
    origin: 3,
    frequency: 3,
    onset: 0,
    startWord: 0,
    midWord: 1,
    endWord: 1,
  },
];
