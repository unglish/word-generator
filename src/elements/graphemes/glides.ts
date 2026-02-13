/** Glide (semivowel) graphemes: /j/, /w/. */
import { Grapheme, GraphemeCondition } from "../../types.js";

export const glideGraphemes: Grapheme[] = [
  // yes
  { phoneme: "j", form: "y", origin: 0, frequency: 30,
    startWord: 1,
    midWord: 1,
    endWord: 0,
   },
  { phoneme: "j", form: "i", origin: 3, frequency: 1,
    startWord: 1,
    midWord: 1,
    endWord: 1,
   },
  {
    phoneme: "j",
    form: "j",
    origin: 3,
    frequency: 1,
    coda: 0,
    startWord: 1,
    midWord: 1,
    endWord: 0,
  },

  // we
  { phoneme: "w", 
    form: "w", 
    origin: 0, 
    frequency: 100,
    startWord: 1,
    midWord: 1,
    endWord: 1,
   },
   { phoneme: "w", 
    form: "wh", 
    origin: 0, 
    coda: 0,
    frequency: 100,
    startWord: 1,
    midWord: 1,
    endWord: 0,
    condition: { wordPosition: ["initial"] },
   }
];
