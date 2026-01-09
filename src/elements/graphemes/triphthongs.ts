/**
 * Triphthong graphemes.
 * 
 * Triphthongs are complex vowel sounds with three components:
 * - aɪə (fire, liar)
 * - aʊə (hour, power)
 * - eɪə (player, layer)
 * - ɔɪə (employer, royal)
 * - əʊə (lower, mower)
 */

import { Grapheme } from "../../types.js";

export const triphthongGraphemes: Grapheme[] = [
  // aɪə: fire, tire, wire
  {
    phoneme: "aɪə",
    form: "ire",
    origin: 0,
    frequency: 50,
    startWord: 3,
    midWord: 1,
    endWord: 100,
  },
  // liar, prior
  {
    phoneme: "aɪə",
    form: "ia",
    origin: 0,
    frequency: 30,
    startWord: 2,
    midWord: 1,
    endWord: 80,
  },
  // buyer, flyer
  {
    phoneme: "aɪə",
    form: "ye",
    origin: 0,
    frequency: 20,
    startWord: 2,
    midWord: 1,
    endWord: 70,
  },
  // choir
  {
    phoneme: "aɪə",
    form: "oi",
    origin: 1,
    frequency: 5,
    startWord: 1,
    midWord: 1,
    endWord: 50,
  },
  // science, client
  {
    phoneme: "aɪə",
    form: "ie",
    origin: 3,
    frequency: 10,
    startWord: 3,
    midWord: 2,
    endWord: 0,
  },

  // aʊə: hour, flour
  {
    phoneme: "aʊə",
    form: "ou",
    origin: 1,
    frequency: 50,
    startWord: 2,
    midWord: 1,
    endWord: 100,
  },
  // shower, power
  {
    phoneme: "aʊə",
    form: "owe",
    origin: 0,
    frequency: 40,
    startWord: 1,
    midWord: 1,
    endWord: 100,
  },

  // eɪə: player, layer
  {
    phoneme: "eɪə",
    form: "aye",
    origin: 0,
    frequency: 50,
    startWord: 2,
    midWord: 1,
    endWord: 100,
  },
  // mayor, prayer
  {
    phoneme: "eɪə",
    form: "ayo",
    origin: 0,
    frequency: 30,
    startWord: 2,
    midWord: 1,
    endWord: 80,
  },
  // conveyor
  {
    phoneme: "eɪə",
    form: "eyo",
    origin: 0,
    frequency: 10,
    startWord: 0,
    midWord: 1,
    endWord: 100,
  },

  // ɔɪə: employer, destroyer
  {
    phoneme: "ɔɪə",
    form: "oye",
    origin: 1,
    frequency: 50,
    startWord: 2,
    midWord: 1,
    endWord: 100,
  },
  // loyal, royal
  {
    phoneme: "ɔɪə",
    form: "oya",
    origin: 1,
    frequency: 40,
    startWord: 1,
    midWord: 1,
    endWord: 100,
  },

  // əʊə: lower, mower
  {
    phoneme: "əʊə",
    form: "owe",
    origin: 0,
    frequency: 50,
    startWord: 1,
    midWord: 2,
    endWord: 100,
  },
  // Noah
  {
    phoneme: "əʊə",
    form: "oa",
    origin: 4,
    frequency: 10,
    startWord: 1,
    midWord: 0,
    endWord: 100,
  },
  // boa
  {
    phoneme: "əʊə",
    form: "oa",
    origin: 0,
    frequency: 5,
    startWord: 1,
    midWord: 0,
    endWord: 100,
  },
];
