/** Rhotic vowel graphemes: /ɜ/ (bird), /ɚ/ (letter). */
import { Grapheme } from "../../types.js";

export const rhoticGraphemes: Grapheme[] = [
  // bed, said, execute
  {
    phoneme: "ɜ",
    form: "e",
    frequency: 100,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "ɜ",
    form: "ai",
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
    frequency: 190,
    startWord: 1,
    midWord: 50,
    endWord: 100,
  },
  {
    phoneme: "ɚ",
    form: "ir",
    frequency: 35,
    startWord: 1,
    midWord: 35,
    endWord: 40,
  },
  {
    phoneme: "ɚ",
    form: "ur",
    frequency: 100,
    startWord: 10,
    midWord: 30,
    endWord: 80,
  },
  {
    phoneme: "ɚ",
    form: "or",
    frequency: 220,
    startWord: 0,
    midWord: 30,
    endWord: 60,
  },
  {
    phoneme: "ɚ",
    form: "ar",
    frequency: 80,
    startWord: 1,
    midWord: 10,
    endWord: 40,
  },
  {
    phoneme: "ɚ",
    form: "eir",
    frequency: 25,
    startWord: 1,
    midWord: 0,
    endWord: 45,
    condition: {
      leftContext: ["ð"],
      segmentPosition: ["final"],
      syllableShape: {
        coda: "empty",
      },
    },
  },
  {
    phoneme: "ɚ",
    form: "re",
    frequency: 50,
    startWord: 0,
    midWord: 5,
    endWord: 100,
    condition: { notLeftContext: ["l", "r"] },
  },
  {
    phoneme: "ɚ",
    form: "ure",
    frequency: 30,
    startWord: 0,
    midWord: 10,
    endWord: 80,
  }
];
