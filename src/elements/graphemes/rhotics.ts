/** Rhotic vowel graphemes: /ɜ/ (bird), /ɚ/ (letter). */
import { Grapheme } from "../../types.js";

export const rhoticGraphemes: Grapheme[] = [
  // bed, said, execute
  {
    phoneme: "ɜ",
    form: "e",
    origin: 0,
    frequency: 100,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "ɜ",
    form: "ai",
    origin: 0,
    frequency: 5,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },

  // her, letter, butter
  {
    phoneme: "ɚ",
    form: "er",
    origin: 0,
    frequency: 300,
    startWord: 1,
    midWord: 50,
    endWord: 100,
  },
  {
    phoneme: "ɚ",
    form: "ur",
    origin: 0,
    frequency: 100,
    startWord: 10,
    midWord: 30,
    endWord: 80,
  },
  {
    phoneme: "ɚ",
    form: "or",
    origin: 3,
    frequency: 220,
    startWord: 0,
    midWord: 30,
    endWord: 60,
  },
  {
    phoneme: "ɚ",
    form: "ar",
    origin: 3,
    frequency: 80,
    startWord: 1,
    midWord: 10,
    endWord: 40,
  },
  {
    phoneme: "ɚ",
    form: "re",
    origin: 1,
    frequency: 50,
    startWord: 0,
    midWord: 5,
    endWord: 100,
    condition: { notLeftContext: ["l", "r"] },
  },
  {
    phoneme: "ɚ",
    form: "ure",
    origin: 3,
    frequency: 30,
    startWord: 0,
    midWord: 10,
    endWord: 80,
  }
];
