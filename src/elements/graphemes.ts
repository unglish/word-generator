import { Grapheme } from "../types.js";

const ORIGINS = ["Germanic", "French", "Greek", "Latin", "Other"];

const graphemes: Grapheme[] = [
  /******************
   * VOWELS
   ******************/

  // i: sheep
  {
    phoneme: "i",
    form: "ee",
    origin: 0,
    frequency: 50,
    startWord: 0,
    midWord: 10,
    endWord: 5,
  },
  {
    phoneme: "i",
    form: "ea",
    origin: 0,
    frequency: 50,
    startWord: 0,
    midWord: 10,
    endWord: 5,
  },
  {
    phoneme: "i",
    form: "e",
    origin: 0,
    frequency: 1,
    startWord: 0,
    midWord: 1,
    endWord: 10,
  },
  {
    phoneme: "i",
    form: "y",
    origin: 1,
    frequency: 1,
    startWord: 0,
    midWord: 1,
    endWord: 10,
  },
  {
    phoneme: "i",
    form: "ie",
    origin: 0,
    frequency: 50,
    startWord: 0,
    midWord: 5,
    endWord: 10,
  },
  {
    phoneme: "i",
    form: "ei",
    origin: 0,
    frequency: 50,
    startWord: 0,
    midWord: 10,
    endWord: 5,
  },

  // ɪ: sit
  { 
    phoneme: "ɪ", 
    form: "i", 
    origin: 0, 
    frequency: 100,
    startWord: 5,
    midWord: 10,
    endWord: 0,
  },
  {
    phoneme: "ɪ",
    form: "y",
    origin: 1,
    frequency: 1,
    startWord: 0,
    midWord: 10,
    endWord: 5,
  },
  {
    phoneme: "ɪ",
    form: "ui",
    origin: 1,
    frequency: 1,
    startWord: 0,
    midWord: 10,
    endWord: 5,
  },

  // e: red
  { 
    phoneme: "e", 
    form: "e", 
    origin: 0, 
    frequency: 250,
    startWord: 10,
    midWord: 10,
    endWord: 5,
  },
  {
    phoneme: "e",
    form: "ea",
    origin: 0,
    frequency: 10,
    startWord: 5,
    midWord: 10,
    endWord: 0,
  },
  {
    phoneme: "e",
    form: "ai",
    origin: 0,
    frequency: 10,
    onset: 0,
    startWord: 0,
    midWord: 10,
    endWord: 5,
  },

  // ɛ: let
  { 
    phoneme: "ɛ", 
    form: "e", 
    origin: 0, 
    frequency: 1000,
    startWord: 10,
    midWord: 10,
    endWord: 5,
  },
  {
    phoneme: "ɛ",
    form: "ea",
    origin: 0,
    frequency: 10,
    onset: 0,
    startWord: 0,
    midWord: 10,
    endWord: 5,
  },

  // æ: cat
  { 
    phoneme: "æ", 
    form: "a", 
    origin: 0, 
    frequency: 10,
    startWord: 10,
    midWord: 10,
    endWord: 5,
  },

  // ɑ: father
  { 
    phoneme: "ɑ", 
    form: "a", 
    origin: 0, 
    frequency: 500,
    startWord: 10,
    midWord: 10,
    endWord: 5,
  },
  {
    phoneme: "ɑ",
    form: "ah",
    origin: 4,
    frequency: 10,
    onset: 0,
    startWord: 0,
    midWord: 5,
    endWord: 10,
  },
  {
    phoneme: "ɑ",
    form: "aa",
    origin: 4,
    frequency: 1,
    onset: 0,
    startWord: 0,
    midWord: 10,
    endWord: 5,
  },
  {
    phoneme: "ɑ",
    form: "au",
    origin: 0,
    frequency: 40,
    onset: 0,
    startWord: 0,
    midWord: 10,
    endWord: 5,
  },

  // ɔ: ball
  {
    phoneme: "ɔ",
    form: "o",
    origin: 0,
    frequency: 10,
    startWord: 10,
    midWord: 10,
    endWord: 5,
  },
  {
    phoneme: "ɔ",
    form: "aw",
    origin: 0,
    frequency: 2,
    onset: 0,
    startWord: 0,
    midWord: 5,
    endWord: 10,
  },

  // hope
  { 
    phoneme: "o", 
    form: "o", 
    origin: 0, 
    frequency: 10,
    startWord: 10,
    midWord: 10,
    endWord: 5,
  },
  {
    phoneme: "o",
    form: "oa",
    origin: 0,
    frequency: 100,
    onset: 0,
    startWord: 0,
    midWord: 10,
    endWord: 5,
  },
  {
    phoneme: "o",
    form: "ow",
    origin: 0,
    frequency: 2,
    onset: 0,
    startWord: 0,
    midWord: 5,
    endWord: 10,
  },
  {
    phoneme: "o",
    form: "oe",
    origin: 0,
    frequency: 100,
    onset: 0,
    startWord: 0,
    midWord: 0,
    endWord: 10,
  },
  {
    phoneme: "o",
    form: "ough",
    origin: 4,
    frequency: 10,
    onset: 0,
    startWord: 0,
    midWord: 5,
    endWord: 10,
  },
  {
    phoneme: "o",
    form: "ew",
    origin: 0,
    frequency: 1,
    onset: 0,
    startWord: 0,
    midWord: 5,
    endWord: 10,
  },

  // book
  {
    phoneme: "ʊ",
    form: "oo",
    origin: 0,
    frequency: 10,
    onset: 0,
    startWord: 0,
    midWord: 10,
    endWord: 5,
  },
  { 
    phoneme: "ʊ", 
    form: "u", 
    origin: 0, 
    frequency: 10,
    startWord: 5,
    midWord: 10,
    endWord: 0,
  },

  // blue
  {
    phoneme: "u",
    form: "ou",
    origin: 1,
    frequency: 100,
    startWord: 0,
    midWord: 10,
    endWord: 5,
  },
  {
    phoneme: "u",
    form: "oo",
    origin: 0,
    frequency: 10,
    startWord: 0,
    midWord: 10,
    endWord: 5,
  },
  { 
    phoneme: "u", 
    form: "u", 
    origin: 0, 
    frequency: 10,
    startWord: 10,
    midWord: 10,
    endWord: 5,
  },
  {
    phoneme: "u",
    form: "ue",
    origin: 0,
    frequency: 10,
    startWord: 0,
    midWord: 5,
    endWord: 10,
  },
  {
    phoneme: "u",
    form: "ew",
    origin: 0,
    frequency: 10,
    startWord: 0,
    midWord: 5,
    endWord: 10,
  },

  // cup
  { 
    phoneme: "ʌ", 
    form: "u", 
    origin: 0, 
    frequency: 10,
    startWord: 10,
    midWord: 10,
    endWord: 0,
  },

  // the
  { 
    phoneme: "ə", 
    form: "e", 
    origin: 0, 
    frequency: 1000,
    startWord: 5,
    midWord: 10,
    endWord: 1,
  },
  { 
    phoneme: "ə", 
    form: "a", 
    origin: 0, 
    frequency: 1,
    startWord: 10, 
    midWord: 5, 
    endWord: 9,
  },
  { 
    phoneme: "ə", 
    form: "o", 
    origin: 0, 
    frequency: 10,
    startWord: 5, 
    midWord: 10, 
    endWord: 0,
  },
  { 
    phoneme: "ə", 
    form: "u", 
    origin: 0, 
    frequency: 10,
    startWord: 5, 
    midWord: 10, 
    endWord: 0,
  },

  // my
  { 
    phoneme: "aɪ", 
    form: "i", 
    origin: 3, 
    frequency: 20,
    startWord: 10,
    midWord: 5,
    endWord: 10,
  },
  {
    phoneme: "aɪ",
    form: "igh",
    origin: 0,
    frequency: 10,
    startWord: 0,
    midWord: 5,
    endWord: 10,
  },
  { 
    phoneme: "aɪ", 
    form: "y", 
    origin: 0, 
    frequency: 5,
    startWord: 0,
    midWord: 5,
    endWord: 10,
  },
  {
    phoneme: "aɪ",
    form: "ie",
    origin: 1,
    frequency: 10,
    onset: 0,
    startWord: 0,
    midWord: 5,
    endWord: 10,
  },
  { 
    phoneme: "aɪ", 
    form: "ai", 
    origin: 3, 
    frequency: 2,
    startWord: 5,
    midWord: 10,
    endWord: 0,
  },
  {
    phoneme: "aɪ",
    form: "is",
    origin: 0,
    frequency: 1,
    onset: 0,
    startWord: 0,
    midWord: 5,
    endWord: 10,
  },
  {
    phoneme: "aɪ",
    form: "ye",
    origin: 0,
    frequency: 3,
    onset: 0,
    startWord: 0,
    midWord: 5,
    endWord: 10,
  },

  // now
  {
    phoneme: "aʊ",
    form: "ow",
    origin: 0,
    frequency: 10,
    startWord: 0,
    midWord: 5,
    endWord: 10,
  },
  {
    phoneme: "aʊ",
    form: "ou",
    origin: 1,
    frequency: 10,
    coda: 0,
    startWord: 5,
    midWord: 10,
    endWord: 0,
  },

  // coin
  {
    phoneme: "ɔɪ",
    form: "oi",
    origin: 3,
    frequency: 10,
    coda: 0,
    startWord: 5,
    midWord: 10,
    endWord: 0,
  },
  {
    phoneme: "ɔɪ",
    form: "oy",
    origin: 0,
    frequency: 2,
    onset: 0,
    startWord: 0,
    midWord: 5,
    endWord: 10,
  },

  // fear
  {
    phoneme: "ɪə",
    form: "ear",
    origin: 0,
    frequency: 10,
    onset: 0,
    startWord: 0,
    midWord: 5,
    endWord: 10,
  },
  {
    phoneme: "ɪə",
    form: "eer",
    origin: 0,
    frequency: 10,
    onset: 0,
    startWord: 0,
    midWord: 5,
    endWord: 10,
  },
  {
    phoneme: "ɪə",
    form: "ier",
    origin: 1,
    frequency: 10,
    onset: 0,
    startWord: 0,
    midWord: 5,
    endWord: 10,
  },

  // day
  { 
    phoneme: "eɪ", 
    form: "a", 
    origin: 0, 
    frequency: 10,
    startWord: 10,
    midWord: 5,
    endWord: 0,
  },
  {
    phoneme: "eɪ",
    form: "ai",
    origin: 3,
    frequency: 10,
    coda: 0,
    startWord: 5,
    midWord: 10,
    endWord: 0,
  },
  {
    phoneme: "eɪ",
    form: "ay",
    origin: 0,
    frequency: 10,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "eɪ",
    form: "eigh",
    origin: 1,
    frequency: 2,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "eɪ",
    form: "ea",
    origin: 0,
    frequency: 10,
    coda: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "eɪ",
    form: "ey",
    origin: 0,
    frequency: 10,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  { 
    phoneme: "eɪ", form: "ae", origin: 3, frequency: 2,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },

  // blow
  {
    phoneme: "ɑʊ",
    form: "ow",
    origin: 0,
    frequency: 10,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "ɑʊ",
    form: "ou",
    origin: 1,
    frequency: 10,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "ɑʊ",
    form: "ough",
    origin: 4,
    frequency: 1,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },

  // bed, said, execute
  {
    phoneme: "ɜ",
    form: "er",
    origin: 0,
    frequency: 100,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "ɜ",
    form: "ir",
    origin: 0,
    frequency: 50,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "ɜ",
    form: "ur",
    origin: 0,
    frequency: 40,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "ɜ",
    form: "ear",
    origin: 0,
    frequency: 3,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "ɜ",
    form: "or",
    origin: 3,
    frequency: 2,
    coda: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "ɜ",
    form: "yr",
    origin: 0,
    frequency: 1,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },

  // her, letter
  {
    phoneme: "ɚ",
    form: "er",
    origin: 0,
    frequency: 10,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "ɚ",
    form: "ar",
    origin: 3,
    frequency: 10,
    coda: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "ɚ",
    form: "or",
    origin: 3,
    frequency: 2,
    coda: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  { phoneme: "ɚ", form: "a", origin: 3, frequency: 1,
    startWord: 1,
    midWord: 1,
    endWord: 1,
   },
  {
    phoneme: "ɚ",
    form: "our",
    origin: 1,
    frequency: 3,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "ɚ",
    form: "ure",
    origin: 3,
    frequency: 10,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },

  /******************
   * GLIDES
   ******************/

  // yes
  { phoneme: "j", form: "y", origin: 0, frequency: 30,
    startWord: 1,
    midWord: 1,
    endWord: 1,
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
    endWord: 1,
  },

  // we
  { phoneme: "w", form: "w", origin: 0, frequency: 100,
    startWord: 1,
    midWord: 1,
    endWord: 1,
   },
  {
    phoneme: "w",
    form: "u",
    origin: 3,
    frequency: 1,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "w",
    form: "o",
    origin: 3,
    frequency: 1,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },

  /******************
   * LIQUIDS
   ******************/

  // love
  { phoneme: "l", form: "l", origin: 3, frequency: 10, startWord: 1,
    midWord: 1,
    endWord: 1, },
  {
    phoneme: "l",
    form: "ll",
    origin: 3,
    frequency: 2,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },

  // run
  { phoneme: "r", form: "r", origin: 3, frequency: 100, startWord: 1,
    midWord: 1,
    endWord: 1,},
  {
    phoneme: "r",
    form: "rr",
    origin: 3,
    frequency: 1,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "r",
    form: "wr",
    origin: 0,
    frequency: 1,
    coda: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "r",
    form: "rh",
    origin: 2,
    frequency: 1,
    coda: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },

  /******************
   * Nasals
   ******************/

  // milk
  { phoneme: "m", form: "m", origin: 3, frequency: 100, startWord: 1,
    midWord: 1,
    endWord: 1, },
  {
    phoneme: "m",
    form: "mm",
    origin: 3,
    frequency: 2,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "m",
    form: "mb",
    origin: 5,
    frequency: 2,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "m",
    form: "mn",
    origin: 2,
    frequency: 1,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "m",
    form: "lm",
    origin: 3,
    frequency: 2,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },

  // no
  { phoneme: "n", form: "n", origin: 3, frequency: 100,startWord: 1,
    midWord: 1,
    endWord: 1, },
  {
    phoneme: "n",
    form: "nn",
    origin: 3,
    frequency: 1,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "n",
    form: "mn",
    origin: 2,
    frequency: 1,
    coda: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "n",
    form: "kn",
    origin: 0,
    frequency: 3,
    coda: 0,startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "n",
    form: "gn",
    origin: 0,
    frequency: 1,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "n",
    form: "pn",
    origin: 2,
    frequency: 1,
    coda: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },

  // sing
  {
    phoneme: "ŋ",
    form: "ng",
    origin: 0,
    frequency: 10,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },

  /******************
   * Fricatives
   ******************/

  // fish
  { phoneme: "f", form: "f", origin: 3, frequency: 100, startWord: 1,
    midWord: 1,
    endWord: 1, },
  {
    phoneme: "f",
    form: "ff",
    origin: 3,
    frequency: 4,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "f",
    form: "ph",
    origin: 2,
    frequency: 1,
    coda: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "f",
    form: "gh",
    origin: 0,
    frequency: 1,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },

  // van
  { phoneme: "v", form: "v", origin: 3, frequency: 100,startWord: 1,
    midWord: 1,
    endWord: 1, },
  { phoneme: "v", form: "f", origin: 3, frequency: 1,startWord: 1,
    midWord: 1,
    endWord: 1, },
  {
    phoneme: "v",
    form: "ph",
    origin: 2,
    frequency: 1,
    coda: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },

  // thin
  { phoneme: "θ", form: "th", origin: 2, frequency: 10, startWord: 1,
    midWord: 1,
    endWord: 1, },

  // this
  { phoneme: "ð", form: "th", origin: 2, frequency: 10, startWord: 1,
    midWord: 1,
    endWord: 1, },

  // sun
  { phoneme: "s", form: "s", origin: 3, frequency: 1000, startWord: 1,
    midWord: 1,
    endWord: 1, },
  { phoneme: "s", form: "c", origin: 3, frequency: 2, startWord: 1,
    midWord: 1,
    endWord: 1, },
  {
    phoneme: "s",
    form: "ss",
    origin: 3,
    frequency: 3,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "s",
    form: "sc",
    origin: 3,
    frequency: 2,
    coda: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "s",
    form: "ps",
    origin: 2,
    frequency: 1,
    coda: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "s",
    form: "st",
    origin: 0,
    frequency: 2,
    coda: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "s",
    form: "ce",
    origin: 3,
    frequency: 3,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "s",
    form: "se",
    origin: 3,
    frequency: 3,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },

  // zebra
  {
    phoneme: "z",
    form: "z",
    origin: 3,
    frequency: 1000,
    coda: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "z",
    form: "s",
    origin: 3,
    frequency: 100,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "z",
    form: "x",
    origin: 3,
    frequency: 1,
    coda: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "z",
    form: "zz",
    origin: 3,
    frequency: 1,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "z",
    form: "ss",
    origin: 3,
    frequency: 1,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "z",
    form: "ze",
    origin: 3,
    frequency: 4,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "z",
    form: "se",
    origin: 3,
    frequency: 1,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },

  // she
  { phoneme: "ʃ", form: "sh", origin: 0, frequency: 750, startWord: 1,
    midWord: 1,
    endWord: 1, },
  {
    phoneme: "ʃ",
    form: "ti",
    origin: 3,
    frequency: 80,
    coda: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "ʃ",
    form: "ci",
    origin: 3,
    frequency: 50,
    coda: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "ʃ",
    form: "ch",
    origin: 3,
    frequency: 30,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "ʃ",
    form: "s",
    origin: 3,
    frequency: 20,
    coda: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "ʃ",
    form: "si",
    origin: 3,
    frequency: 20,
    coda: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "ʃ",
    form: "ce",
    origin: 3,
    frequency: 8,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "ʃ",
    form: "ssi",
    origin: 3,
    frequency: 7,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "ʃ",
    form: "sc",
    origin: 3,
    frequency: 10,
    coda: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "ʃ",
    form: "xi",
    origin: 3,
    frequency: 10,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "ʃ",
    form: "sch",
    origin: 3,
    frequency: 1,
    coda: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },

  // measure
  { phoneme: "ʒ", form: "s", origin: 3, frequency: 10,startWord: 1,
    midWord: 1,
    endWord: 1, },
  {
    phoneme: "ʒ",
    form: "si",
    origin: 3,
    frequency: 10,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  { phoneme: "ʒ", form: "z", origin: 3, frequency: 10,startWord: 1,
    midWord: 1,
    endWord: 1, },
  {
    phoneme: "ʒ",
    form: "g",
    origin: 3,
    frequency: 10,
    coda: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "ʒ",
    form: "ge",
    origin: 3,
    frequency: 10,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "ʒ",
    form: "dge",
    origin: 3,
    frequency: 10,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },

  // hat
  {
    phoneme: "h",
    form: "h",
    origin: 0,
    frequency: 50,
    coda: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "h",
    form: "wh",
    origin: 0,
    frequency: 1,
    coda: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },

  /******************
   * Affricates
   ******************/

  // cheese
  {
    phoneme: "tʃ",
    form: "ch",
    origin: 3,
    frequency: 100,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "tʃ",
    form: "tch",
    origin: 0,
    frequency: 100,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "tʃ",
    form: "tu",
    origin: 3,
    frequency: 1,
    coda: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },

  // dʒ judge
  {
    phoneme: "dʒ",
    form: "g",
    origin: 3,
    frequency: 2,
    coda: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "dʒ",
    form: "j",
    origin: 3,
    frequency: 20,
    coda: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "dʒ",
    form: "ge",
    origin: 3,
    frequency: 6,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "dʒ",
    form: "dge",
    origin: 3,
    frequency: 10,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "dʒ",
    form: "di",
    origin: 3,
    frequency: 1,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "dʒ",
    form: "gg",
    origin: 3,
    frequency: 1,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },

  /******************
   * Plosives
   ******************/

  // pig
  { phoneme: "p", form: "p", origin: 3, frequency: 50, startWord: 1,
    midWord: 1,
    endWord: 1, },
  {
    phoneme: "p", 
    form: "pp",
    origin: 3,
    frequency: 1,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },

  // b boy
  { phoneme: "b", form: "b", origin: 3, frequency: 100,startWord: 1,
    midWord: 1,
    endWord: 1, },
  {
    phoneme: "b",
    form: "bb",
    origin: 3,
    frequency: 2,
    onset: 0,
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
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },

  // t top
  { phoneme: "t", form: "t", origin: 3, frequency: 2500, startWord: 1,
    midWord: 1,
    endWord: 1, },
  {
    phoneme: "t",
    form: "tt",
    origin: 3,
    frequency: 10,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  
  { phoneme: "t", form: "th", origin: 2, frequency: 1, coda: 0,startWord: 1,
    midWord: 1,
    endWord: 1, },
  {
    phoneme: "t",
    form: "bt",
    origin: 3,
    frequency: 1,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "t",
    form: "ed",
    origin: 3,
    frequency: 2,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },

  // d dog
  { phoneme: "d", form: "d", origin: 3, frequency: 300,startWord: 1,
    midWord: 1,
    endWord: 1, },
  {
    phoneme: "d",
    form: "dd",
    origin: 3,
    frequency: 3,
    onset: 0,
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
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },

  // k: cat
  { phoneme: "k", form: "k", origin: 3, frequency: 50,startWord: 1,
    midWord: 1,
    endWord: 1, },
  { phoneme: "k", form: "c", origin: 3, frequency: 20,startWord: 1,
    midWord: 1,
    endWord: 1, },
  {
    phoneme: "k",
    form: "ck",
    origin: 3,
    frequency: 10,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "k",
    form: "ch",
    origin: 3,
    frequency: 2,
    coda: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "k",
    form: "cc",
    origin: 3,
    frequency: 1,
    onset: 0,
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
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "k",
    form: "qu",
    origin: 3,
    frequency: 2,
    onset: 0,
    startWord: 1,
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
  { phoneme: "g", form: "g", origin: 3, frequency: 100,
    startWord: 1,
    midWord: 1,
    endWord: 1,
   },
  {
    phoneme: "g",
    form: "gg",
    origin: 3,
    frequency: 2,
    onset: 0,
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
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "g",
    form: "gu",
    origin: 3,
    frequency: 1,
    coda: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
  {
    phoneme: "g",
    form: "gue",
    origin: 3,
    frequency: 3,
    onset: 0,
    startWord: 1,
    midWord: 1,
    endWord: 1,
  },
];

export { ORIGINS, graphemes };
