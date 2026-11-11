/** Monophthong (pure vowel) graphemes: /iː/, /ɪ/, /ɛ/, /æ/, /ɑ/, /ɔ/, /ʊ/, /u/, /ʌ/, /ə/. */
import { Grapheme } from "../../types.js";

export const vowelGraphemes: Grapheme[] = [
  // i: sheep
  {
    phoneme: "i:",
    form: "ee",
    frequency: 3,
    startWord: 0,
    midWord: 4,
    endWord: 1,
  },
  {
    phoneme: "i:",
    form: "ea",
    frequency: 2,
    startWord: 20,
    midWord: 3,
    endWord: 1,
    condition: { alias: "notBeforeVowelLetter" },
  },
  {
    phoneme: "i:",
    form: "e",
    frequency: 5,
    startWord: 100,
    midWord: 1,
    endWord: 0,
  },
  {
    phoneme: "i:",
    form: "y",
    frequency: 3,
    startWord: 0,
    midWord: 0,
    endWord: 5,
    condition: {
      segmentPosition: ["final"],
      notRightContext: ["consonant"],
    },
  },
  {
    phoneme: "i:",
    form: "ie",
    frequency: 1,
    startWord: 0,
    midWord: 5,
    endWord: 2,
  },
  {
    phoneme: "i:",
    form: "ei",
    frequency: 2,
    startWord: 10,
    midWord: 1,
    endWord: 0,
  },
  // people
  {
    phoneme: "i:",
    form: "eo",
    frequency: 1, 
    startWord: 0,
    midWord: 1,
    endWord: 0,
  },

  // ɪ: sit
  { 
    phoneme: "ɪ", 
    form: "i", 
    frequency: 1000,
    startWord: 5,
    midWord: 10,
    endWord: 1.0,
  },
  // Note: /ɪ/ before /ŋ/ already maps to "i" via the default entry above.
  // myth
  {
    phoneme: "ɪ",
    form: "y",
    frequency: 2,
    startWord: 0,
    midWord: 1,
    endWord: 0,
  },
  // build
  {
    phoneme: "ɪ",
    form: "ui",
    frequency: 1,
    startWord: 0,
    midWord: 1,
    endWord: 0,
  },

  // ɛ: let
  { 
    phoneme: "ɛ", 
    form: "e", 
    frequency: 100,
    startWord: 10,
    midWord: 10,
    endWord: 5,
  },
  // threat
  {
    phoneme: "ɛ",
    form: "ea",
    frequency: 140,
    onset: 0,
    startWord: 0,
    midWord: 10,
    endWord: 5,
    condition: { alias: "notBeforeVowelLetter" },
  },
  // æ: cat
  { 
    phoneme: "æ", 
    form: "a", 
    frequency: 10,
    startWord: 10,
    midWord: 10,
    endWord: 5,
  },

  // ɑ: father
  { 
    phoneme: "ɑ", 
    form: "a", 
    frequency: 600,
    startWord: 10,
    midWord: 10,
    endWord: 5,
  },
  {
    phoneme: "ɑ",
    form: "o",
    frequency: 300,
    startWord: 10,
    midWord: 10,
    endWord: 5,
  },
  {
    phoneme: "ɑ",
    form: "ah",
    frequency: 10,
    startWord: 0,
    midWord: 5,
    endWord: 10,
  },
  {
    phoneme: "ɑ",
    form: "aa",
    frequency: 1,
    startWord: 1,
    midWord: 1,
    endWord: 0,
  },
  {
    phoneme: "ɑ",
    form: "au",
    frequency: 40,
    startWord: 1,
    midWord: 10,
    endWord: 10,
    condition: { wordFinal: false },
  },
  {
    phoneme: "ɑ",
    form: "aue",
    frequency: 40,
    startWord: 1,
    midWord: 10,
    endWord: 10,
  },

  // ɔ: ball
  {
    phoneme: "ɔ",
    form: "o",
    frequency: 10,
    startWord: 10,
    midWord: 10,
    endWord: 5,
  },
  {
    phoneme: "ɔ",
    form: "aw",
    frequency: 1,
    onset: 0,
    startWord: 0,
    midWord: 1,
    endWord: 2,
  },
  {
    phoneme: "ɔ",
    form: "ough",
    frequency: 4,
    onset: 0,
    coda: 0,
    startWord: 0,
    midWord: 0,
    endWord: 5,
    condition: { rightContext: ["t"] },
  },

  // book
  {
    phoneme: "ʊ",
    form: "oo",
    frequency: 80,
    onset: 0,
    startWord: 0,
    midWord: 5,
    endWord: 4,
  },
  { 
    phoneme: "ʊ", 
    form: "u", 
    frequency: 30,
    startWord: 1,
    midWord: 1,
    endWord: 1,
    condition: { notLeftContext: ["g"] },
  },
  // could, would, should, courier
  {
    phoneme: "ʊ",
    form: "ou",
    frequency: 8,
    startWord: 0,
    midWord: 5,
    endWord: 0,
  },

  // blue
  {
    phoneme: "u",
    form: "ou",
    frequency: 2,
    startWord: 0,
    midWord: 10,
    endWord: 0,
  },
  {
    phoneme: "u",
    form: "oo",
    frequency: 30,
    startWord: 0,
    midWord: 3,
    endWord: 3,
  },
  {
    phoneme: "u",
    form: "u",
    frequency: 10,
    startWord: 10,
    midWord: 10,
    endWord: 2,
    condition: { notLeftContext: ["g"] },
  },
  {
    phoneme: "u",
    form: "ue",
    frequency: 10,
    startWord: 0,
    midWord: 5,
    endWord: 50,
  },
  {
    phoneme: "u",
    form: "ew",
    frequency: 7,
    startWord: 1,
    midWord: 4,
    endWord: 20,
  },

  // cup
  { 
    phoneme: "ʌ", 
    form: "u", 
    frequency: 1000,
    startWord: 1,
    midWord: 1,
    endWord: 0,
  },
  // son, come, love, money, month, front, other, mother
  {
    phoneme: "ʌ",
    form: "o",
    frequency: 300,
    startWord: 3,
    midWord: 8,
    endWord: 1,
  },
  { 
    phoneme: "ʌ", 
    form: "uh", 
    frequency: 3,
    startWord: 1,
    midWord: 4,
    endWord: 1,
  },

  // the
  { 
    phoneme: "ə", 
    form: "e", 
    frequency: 150,
    startWord: 5,
    midWord: 10,
    endWord: 1,
  },
  // Note: "i" before /ŋ/ handled via spelling rule (eng→ing) rather than
  // grapheme condition, since the nucleus can span diphthong + schwa
  // across syllables.
  { 
    phoneme: "ə", 
    form: "a", 
    frequency: 300,
    startWord: 1000, 
    midWord: 5, 
    endWord: 9,
  },
  { 
    phoneme: "ə", 
    form: "o", 
    frequency: 200,
    startWord: 1, 
    midWord: 5, 
    endWord: 1,
  },
  { 
    phoneme: "ə", 
    form: "ou", 
    frequency: 1,
    startWord: 1, 
    midWord: 1, 
    endWord: 1,
  },
  { 
    phoneme: "ə", 
    form: "u", 
    frequency: 50,
    startWord: 5, 
    midWord: 10, 
    endWord: 0,
  },
  { 
    phoneme: "ə", 
    form: "i", 
    frequency: 220,
    startWord: 1, 
    midWord: 10, 
    endWord: 0,
  },
];
