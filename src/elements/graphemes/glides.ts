/** Glide (semivowel) graphemes: /j/, /w/. */
import { Grapheme } from "../../types.js";

export const glideGraphemes: Grapheme[] = [
  // yes
  { phoneme: "j", form: "y", origin: 0, frequency: 30,
    startWord: 1,
    midWord: 1,
    endWord: 0,
  },
  // /j/ → "i" removed: creates illegal "iy" bigrams when followed by
  // front-vowel graphemes. The "y" form covers all positions.

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
    condition: { 
      wordPosition: ["initial"],
      notRightContext: ["u", "u:", "ʊ", "ʌ", "ə", "ɚ", "ɜ", "aʊ", "əʊ"]  // Block "whu", "whoo", "whuh", "whur" patterns
    },
  }
];
