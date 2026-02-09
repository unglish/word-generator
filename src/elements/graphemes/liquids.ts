/** Liquid graphemes: /l/, /r/. */
import { Grapheme, GraphemeCondition } from "../../types.js";

export const liquidGraphemes: Grapheme[] = [
  // love
  { phoneme: "l",
    form: "l", 
    origin: 3, 
    frequency: 10, 
    startWord: 1,
    midWord: 1,
    endWord: 1, },

  // run
  { phoneme: "r", 
    form: "r", 
    origin: 3, 
    frequency: 1000, 
    startWord: 1,
    midWord: 1,
    endWord: 1,},
  {
    phoneme: "r",
    form: "wr",
    origin: 0,
    frequency: 1,
    coda: 0,
    cluster: 0,
    startWord: 1,
    midWord: 1,
    endWord: 0,
    condition: { wordPosition: ["initial"] },
  },
  {
    phoneme: "r",
    form: "rh",
    origin: 2,
    frequency: 1,
    coda: 0,
    cluster: 0,
    startWord: 30,
    midWord: 1,
    endWord: 0,
  }
];
