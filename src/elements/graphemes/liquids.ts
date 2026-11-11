/** Liquid graphemes: /l/, /r/. */
import { Grapheme } from "../../types.js";

export const liquidGraphemes: Grapheme[] = [
  // love
  { phoneme: "l",
    form: "l", 
    frequency: 10, 
    startWord: 1,
    midWord: 1,
    endWord: 1, },

  // run
  { phoneme: "r", 
    form: "r", 
    frequency: 1000, 
    startWord: 1,
    midWord: 1,
    endWord: 1,},
  {
    phoneme: "r",
    form: "wr",
    frequency: 1,
    coda: 0,
    cluster: 0,
    startWord: 1,
    midWord: 1,
    endWord: 0,
    condition: { segmentPosition: ["initial"] },
  },
  {
    phoneme: "r",
    form: "rh",
    frequency: 1,
    coda: 0,
    cluster: 0,
    startWord: 30,
    midWord: 1,
    endWord: 0,
  }
];
