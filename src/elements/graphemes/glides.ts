/** Glide (semivowel) graphemes: /j/, /w/. */
import { Grapheme } from "../../types.js";

export const glideGraphemes: Grapheme[] = [
  // yes
  { phoneme: "j", form: "y", frequency: 30,
    startWord: 1,
    midWord: 1,
    endWord: 0,
  },
  // we
  { phoneme: "w", 
    form: "w", 
    frequency: 100,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  { phoneme: "w", 
    form: "wh", 
    coda: 0,
    frequency: 5,
    startWord: 1,
    midWord: 1,
    endWord: 1,
    condition: { 
      segmentPosition: ["initial"],
      notLeftContext: ["consonant"],
      notRightContext: ["u", "u:", "ʊ", "ʌ", "ə", "ɚ", "ɜ", "aʊ", "əʊ"]  // Block "whu", "whoo", "whuh", "whur" patterns
    },
  }
];
