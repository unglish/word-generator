const ORIGINS = ["Germanic", "French", "Greek", "Latin", "Other"];

export interface Grapheme {
  phoneme: string;
  form: string;
  origin: number;
  frequency: number;
  invalidPositions: string[];
}

const graphemes = [
  /******************
   * VOWELS
   ******************/

  // i: sheep
  {
    phoneme: "i",
    form: "ee",
    origin: 0,
    frequency: 10,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "i",
    form: "ea",
    origin: 0,
    frequency: 10,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "i",
    form: "e",
    origin: 0,
    frequency: 1,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "i",
    form: "y",
    origin: 1,
    frequency: 4,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "i",
    form: "ie",
    origin: 0,
    frequency: 10,
    invalidPositions: ["onset"],
  },
  { phoneme: "i", form: "i", origin: 0, frequency: 10, invalidPositions: [] },

  // ɪ: sit
  { phoneme: "ɪ", form: "i", origin: 0, frequency: 10, invalidPositions: [] },
  {
    phoneme: "ɪ",
    form: "y",
    origin: 1,
    frequency: 10,
    invalidPositions: ["onset"],
    examples: ["symbol", "system"],
  },
  {
    phoneme: "ɪ",
    form: "ui",
    origin: 1,
    frequency: 10,
    invalidPositions: ["onset"],
  },

  // e: red
  { phoneme: "e", form: "e", origin: 0, frequency: 10, invalidPositions: [] },
  {
    phoneme: "e",
    form: "ea",
    origin: 0,
    frequency: 10,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "e",
    form: "ai",
    origin: 0,
    frequency: 10,
    invalidPositions: ["onset"],
  },

  // ɛ: let
  { phoneme: "ɛ", form: "e", origin: 0, frequency: 10, invalidPositions: [] },
  {
    phoneme: "ɛ",
    form: "ea",
    origin: 0,
    frequency: 10,
    invalidPositions: ["onset"],
  },

  // æ: cat
  { phoneme: "æ", form: "a", origin: 0, frequency: 10, invalidPositions: [] },

  // ɑ: father
  { phoneme: "ɑ", form: "a", origin: 0, frequency: 50, invalidPositions: [] },
  {
    phoneme: "ɑ",
    form: "ah",
    origin: 4,
    frequency: 10,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "ɑ",
    form: "aa",
    origin: 4,
    frequency: 1,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "ɑ",
    form: "au",
    origin: 0,
    frequency: 4,
    invalidPositions: ["onset"],
  },

  // ɔ: ball
  {
    phoneme: "ɔ",
    form: "o",
    origin: 0,
    frequency: 10,
    invalidPositions: [],
    examples: ["hot"],
  },
  {
    phoneme: "ɔ",
    form: "aw",
    origin: 0,
    frequency: 2,
    invalidPositions: ["onset"],
    examples: ["saw"],
  },

  // hope
  { phoneme: "o", form: "o", origin: 0, frequency: 10, invalidPositions: [] },
  {
    phoneme: "o",
    form: "oa",
    origin: 0,
    frequency: 10,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "o",
    form: "ow",
    origin: 0,
    frequency: 4,
    invalidPositions: ["onset"],
    examples: ["sow"],
  },
  {
    phoneme: "o",
    form: "oe",
    origin: 0,
    frequency: 10,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "o",
    form: "ough",
    origin: 4,
    frequency: 2,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "o",
    form: "ew",
    origin: 0,
    frequency: 4,
    invalidPositions: ["onset"],
  },

  // book
  {
    phoneme: "ʊ",
    form: "oo",
    origin: 0,
    frequency: 10,
    invalidPositions: ["onset"],
  },
  { phoneme: "ʊ", form: "u", origin: 0, frequency: 10, invalidPositions: [] },

  // blue
  {
    phoneme: "u",
    form: "oo",
    origin: 0,
    frequency: 10,
    invalidPositions: ["onset"],
  },
  { phoneme: "u", form: "u", origin: 0, frequency: 10, invalidPositions: [] },
  {
    phoneme: "u",
    form: "ou",
    origin: 1,
    frequency: 10,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "u",
    form: "ue",
    origin: 0,
    frequency: 10,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "u",
    form: "ew",
    origin: 0,
    frequency: 10,
    invalidPositions: ["onset"],
  },

  // cup
  { phoneme: "ʌ", form: "u", origin: 0, frequency: 10, invalidPositions: [] },

  // the
  { phoneme: "ə", form: "e", origin: 0, frequency: 10, invalidPositions: [] },
  { phoneme: "ə", form: "a", origin: 0, frequency: 10, invalidPositions: [] },
  { phoneme: "ə", form: "o", origin: 0, frequency: 10, invalidPositions: [] },
  { phoneme: "ə", form: "i", origin: 0, frequency: 10, invalidPositions: [] },
  { phoneme: "ə", form: "u", origin: 0, frequency: 10, invalidPositions: [] },

  // my
  { phoneme: "aɪ", form: "i", origin: 3, frequency: 20, invalidPositions: [] },
  {
    phoneme: "aɪ",
    form: "igh",
    origin: 0,
    frequency: 10,
    invalidPositions: ["onset"],
  },
  { phoneme: "aɪ", form: "y", origin: 0, frequency: 5, invalidPositions: [] },
  {
    phoneme: "aɪ",
    form: "ie",
    origin: 1,
    frequency: 10,
    invalidPositions: ["onset"],
  },
  { phoneme: "aɪ", form: "ai", origin: 3, frequency: 2, invalidPositions: [] },
  {
    phoneme: "aɪ",
    form: "is",
    origin: 0,
    frequency: 1,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "aɪ",
    form: "ye",
    origin: 0,
    frequency: 7,
    invalidPositions: ["onset"],
  },

  // now
  {
    phoneme: "aʊ",
    form: "ow",
    origin: 0,
    frequency: 10,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "aʊ",
    form: "ou",
    origin: 1,
    frequency: 10,
    invalidPositions: ["onset"],
  },

  // boy
  {
    phoneme: "oɪ",
    form: "oi",
    origin: 3,
    frequency: 10,
    invalidPositions: ["coda"],
  },
  {
    phoneme: "oɪ",
    form: "oy",
    origin: 0,
    frequency: 2,
    invalidPositions: ["onset"],
  },

  // coin
  {
    phoneme: "ɔɪ",
    form: "oi",
    origin: 3,
    frequency: 10,
    invalidPositions: ["coda"],
  },
  {
    phoneme: "ɔɪ",
    form: "oy",
    origin: 0,
    frequency: 10,
    invalidPositions: ["onset"],
  },

  // fear
  {
    phoneme: "ɪə",
    form: "ear",
    origin: 0,
    frequency: 10,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "ɪə",
    form: "eer",
    origin: 0,
    frequency: 10,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "ɪə",
    form: "ier",
    origin: 1,
    frequency: 10,
    invalidPositions: ["onset"],
  },

  // day
  { phoneme: "eɪ", form: "a", origin: 0, frequency: 10, invalidPositions: [] },
  {
    phoneme: "eɪ",
    form: "ai",
    origin: 3,
    frequency: 10,
    invalidPositions: ["coda"],
  },
  {
    phoneme: "eɪ",
    form: "ay",
    origin: 0,
    frequency: 10,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "eɪ",
    form: "eigh",
    origin: 1,
    frequency: 2,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "eɪ",
    form: "ea",
    origin: 0,
    frequency: 10,
    invalidPositions: ["coda"],
  },
  {
    phoneme: "eɪ",
    form: "ey",
    origin: 0,
    frequency: 10,
    invalidPositions: ["onset"],
  },
  { phoneme: "eɪ", form: "ae", origin: 3, frequency: 2, invalidPositions: [] },

  // now
  {
    phoneme: "ɑʊ",
    form: "ow",
    origin: 0,
    frequency: 10,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "ɑʊ",
    form: "ou",
    origin: 1,
    frequency: 10,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "ɑʊ",
    form: "ough",
    origin: 4,
    frequency: 3,
    invalidPositions: ["onset"],
  },

  // her
  {
    phoneme: "ɜ",
    form: "er",
    origin: 0,
    frequency: 10,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "ɜ",
    form: "ir",
    origin: 0,
    frequency: 10,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "ɜ",
    form: "ur",
    origin: 0,
    frequency: 10,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "ɜ",
    form: "ear",
    origin: 0,
    frequency: 2,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "ɜ",
    form: "or",
    origin: 3,
    frequency: 3,
    invalidPositions: ["coda"],
  },
  {
    phoneme: "ɜ",
    form: "yr",
    origin: 0,
    frequency: 2,
    invalidPositions: ["onset"],
  },

  // letter
  {
    phoneme: "ɚ",
    form: "er",
    origin: 0,
    frequency: 10,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "ɚ",
    form: "ar",
    origin: 3,
    frequency: 10,
    invalidPositions: ["coda"],
  },
  {
    phoneme: "ɚ",
    form: "or",
    origin: 3,
    frequency: 2,
    invalidPositions: ["coda"],
  },
  { phoneme: "ɚ", form: "a", origin: 3, frequency: 1, invalidPositions: [] },
  {
    phoneme: "ɚ",
    form: "our",
    origin: 1,
    frequency: 3,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "ɚ",
    form: "ure",
    origin: 3,
    frequency: 10,
    invalidPositions: ["onset"],
  },

  /******************
   * GLIDES
   ******************/

  // yes
  { phoneme: "j", form: "y", origin: 0, frequency: 30, invalidPositions: [] },
  { phoneme: "j", form: "i", origin: 3, frequency: 1, invalidPositions: [] },
  {
    phoneme: "j",
    form: "j",
    origin: 3,
    frequency: 4,
    invalidPositions: ["coda"],
  },

  // we
  { phoneme: "w", form: "w", origin: 0, frequency: 10, invalidPositions: [] },
  {
    phoneme: "w",
    form: "u",
    origin: 3,
    frequency: 1,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "w",
    form: "o",
    origin: 3,
    frequency: 1,
    invalidPositions: ["onset"],
  },

  /******************
   * LIQUIDS
   ******************/

  // love
  { phoneme: "l", form: "l", origin: 3, frequency: 10, invalidPositions: [] },
  {
    phoneme: "l",
    form: "ll",
    origin: 3,
    frequency: 5,
    invalidPositions: ["onset"],
  },

  // run
  { phoneme: "r", form: "r", origin: 3, frequency: 25, invalidPositions: [] },
  {
    phoneme: "r",
    form: "rr",
    origin: 3,
    frequency: 1,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "r",
    form: "wr",
    origin: 0,
    frequency: 1,
    invalidPositions: ["coda"],
  },
  {
    phoneme: "r",
    form: "rh",
    origin: 2,
    frequency: 1,
    invalidPositions: ["coda"],
  },

  /******************
   * Nasals
   ******************/

  // milk
  { phoneme: "m", form: "m", origin: 3, frequency: 25, invalidPositions: [] },
  {
    phoneme: "m",
    form: "mm",
    origin: 3,
    frequency: 2,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "m",
    form: "mb",
    origin: 3,
    frequency: 2,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "m",
    form: "mn",
    origin: 2,
    frequency: 1,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "m",
    form: "lm",
    origin: 3,
    frequency: 2,
    invalidPositions: ["onset"],
  },

  // no
  { phoneme: "n", form: "n", origin: 3, frequency: 25, invalidPositions: [] },
  {
    phoneme: "n",
    form: "nn",
    origin: 3,
    frequency: 2,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "n",
    form: "mn",
    origin: 2,
    frequency: 1,
    invalidPositions: ["coda"],
  },
  {
    phoneme: "n",
    form: "kn",
    origin: 0,
    frequency: 5,
    invalidPositions: ["coda"],
  },
  {
    phoneme: "n",
    form: "gn",
    origin: 0,
    frequency: 3,
    invalidPositions: ["coda"],
  },
  {
    phoneme: "n",
    form: "pn",
    origin: 2,
    frequency: 3,
    invalidPositions: ["coda"],
  },

  // sing
  { phoneme: "ŋ", form: "n", origin: 3, frequency: 10, invalidPositions: [] },
  {
    phoneme: "ŋ",
    form: "ng",
    origin: 0,
    frequency: 10,
    invalidPositions: ["onset"],
  },

  /******************
   * Fricatives
   ******************/

  // fish
  { phoneme: "f", form: "f", origin: 3, frequency: 10, invalidPositions: [] },
  {
    phoneme: "f",
    form: "ff",
    origin: 3,
    frequency: 2,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "f",
    form: "ph",
    origin: 2,
    frequency: 2,
    invalidPositions: ["coda"],
  },
  {
    phoneme: "f",
    form: "gh",
    origin: 0,
    frequency: 3,
    invalidPositions: ["onset"],
  },

  // van
  { phoneme: "v", form: "v", origin: 3, frequency: 10, invalidPositions: [] },
  { phoneme: "v", form: "f", origin: 3, frequency: 10, invalidPositions: [] },
  {
    phoneme: "v",
    form: "ve",
    origin: 3,
    frequency: 10,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "v",
    form: "ph",
    origin: 2,
    frequency: 10,
    invalidPositions: ["coda"],
  },

  // thin
  { phoneme: "θ", form: "th", origin: 2, frequency: 10, invalidPositions: [] },

  // this
  { phoneme: "ð", form: "th", origin: 2, frequency: 10, invalidPositions: [] },

  // sun
  { phoneme: "s", form: "s", origin: 3, frequency: 10, invalidPositions: [] },
  { phoneme: "s", form: "c", origin: 3, frequency: 1, invalidPositions: [] },
  {
    phoneme: "s",
    form: "ss",
    origin: 3,
    frequency: 3,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "s",
    form: "sc",
    origin: 3,
    frequency: 1,
    invalidPositions: ["coda"],
  },
  {
    phoneme: "s",
    form: "ps",
    origin: 2,
    frequency: 1,
    invalidPositions: ["coda"],
  },
  {
    phoneme: "s",
    form: "st",
    origin: 0,
    frequency: 2,
    invalidPositions: ["coda"],
  },
  {
    phoneme: "s",
    form: "ce",
    origin: 3,
    frequency: 3,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "s",
    form: "se",
    origin: 3,
    frequency: 3,
    invalidPositions: ["onset"],
  },

  // zebra
  {
    phoneme: "z",
    form: "z",
    origin: 3,
    frequency: 10,
    invalidPositions: ["coda"],
  },
  {
    phoneme: "z",
    form: "s",
    origin: 3,
    frequency: 3,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "z",
    form: "x",
    origin: 3,
    frequency: 4,
    invalidPositions: ["coda"],
  },
  {
    phoneme: "z",
    form: "zz",
    origin: 3,
    frequency: 10,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "z",
    form: "ss",
    origin: 3,
    frequency: 3,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "z",
    form: "ze",
    origin: 3,
    frequency: 2,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "z",
    form: "se",
    origin: 3,
    frequency: 2,
    invalidPositions: ["onset"],
  },

  // she
  { phoneme: "ʃ", form: "s", origin: 3, frequency: 1, invalidPositions: [] },
  { phoneme: "ʃ", form: "t", origin: 3, frequency: 1, invalidPositions: [] },
  { phoneme: "ʃ", form: "sh", origin: 0, frequency: 10, invalidPositions: [] },
  {
    phoneme: "ʃ",
    form: "ch",
    origin: 3,
    frequency: 1,
    invalidPositions: ["coda"],
  },
  {
    phoneme: "ʃ",
    form: "ss",
    origin: 3,
    frequency: 1,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "ʃ",
    form: "ci",
    origin: 3,
    frequency: 4,
    invalidPositions: ["coda"],
  },
  {
    phoneme: "ʃ",
    form: "si",
    origin: 3,
    frequency: 2,
    invalidPositions: ["coda"],
  },
  {
    phoneme: "ʃ",
    form: "ce",
    origin: 3,
    frequency: 2,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "ʃ",
    form: "sc",
    origin: 3,
    frequency: 10,
    invalidPositions: ["coda"],
  },
  {
    phoneme: "ʃ",
    form: "ti",
    origin: 3,
    frequency: 1,
    invalidPositions: ["coda"],
  },

  // measure
  { phoneme: "ʒ", form: "s", origin: 3, frequency: 10, invalidPositions: [] },
  {
    phoneme: "ʒ",
    form: "si",
    origin: 3,
    frequency: 10,
    invalidPositions: ["onset"],
  },
  { phoneme: "ʒ", form: "z", origin: 3, frequency: 10, invalidPositions: [] },
  {
    phoneme: "ʒ",
    form: "g",
    origin: 3,
    frequency: 10,
    invalidPositions: ["coda"],
  },
  {
    phoneme: "ʒ",
    form: "ge",
    origin: 3,
    frequency: 10,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "ʒ",
    form: "dge",
    origin: 3,
    frequency: 10,
    invalidPositions: ["onset"],
  },

  // hat
  {
    phoneme: "h",
    form: "h",
    origin: 0,
    frequency: 10,
    invalidPositions: ["coda"],
  },
  {
    phoneme: "h",
    form: "wh",
    origin: 0,
    frequency: 3,
    invalidPositions: ["coda"],
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
    invalidPositions: [],
  },
  {
    phoneme: "tʃ",
    form: "tch",
    origin: 0,
    frequency: 50,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "tʃ",
    form: "tu",
    origin: 3,
    frequency: 1,
    invalidPositions: ["coda"],
  },

  // dʒ judge
  {
    phoneme: "dʒ",
    form: "g",
    origin: 3,
    frequency: 2,
    invalidPositions: ["coda"],
  },
  {
    phoneme: "dʒ",
    form: "j",
    origin: 3,
    frequency: 20,
    invalidPositions: ["coda"],
  },
  {
    phoneme: "dʒ",
    form: "ge",
    origin: 3,
    frequency: 6,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "dʒ",
    form: "dge",
    origin: 3,
    frequency: 10,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "dʒ",
    form: "di",
    origin: 3,
    frequency: 1,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "dʒ",
    form: "gg",
    origin: 3,
    frequency: 1,
    invalidPositions: ["onset"],
  },

  /******************
   * Plosives
   ******************/

  // pig
  { phoneme: "p", form: "p", origin: 3, frequency: 50, invalidPositions: [] },
  {
    phoneme: "p",
    form: "pp",
    origin: 3,
    frequency: 1,
    invalidPositions: ["onset"],
  },

  // b boy
  { phoneme: "b", form: "b", origin: 3, frequency: 25, invalidPositions: [] },
  {
    phoneme: "b",
    form: "bb",
    origin: 3,
    frequency: 5,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "b",
    form: "pb",
    origin: 3,
    frequency: 1,
    invalidPositions: ["onset"],
  },

  // t top
  { phoneme: "t", form: "t", origin: 3, frequency: 25, invalidPositions: [] },
  {
    phoneme: "t",
    form: "tt",
    origin: 3,
    frequency: 2,
    invalidPositions: ["onset"],
  },
  { phoneme: "t", form: "th", origin: 2, frequency: 1, invalidPositions: [] },
  {
    phoneme: "t",
    form: "bt",
    origin: 3,
    frequency: 1,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "t",
    form: "ed",
    origin: 3,
    frequency: 2,
    invalidPositions: ["onset"],
  },

  // d dog
  { phoneme: "d", form: "d", origin: 3, frequency: 10, invalidPositions: [] },
  {
    phoneme: "d",
    form: "dd",
    origin: 3,
    frequency: 3,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "d",
    form: "ed",
    origin: 3,
    frequency: 6,
    invalidPositions: ["onset"],
  },

  // k: cat
  { phoneme: "k", form: "k", origin: 3, frequency: 20, invalidPositions: [] },
  { phoneme: "k", form: "c", origin: 3, frequency: 4, invalidPositions: [] },
  {
    phoneme: "k",
    form: "ck",
    origin: 3,
    frequency: 10,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "k",
    form: "ch",
    origin: 3,
    frequency: 2,
    invalidPositions: ["coda"],
  },
  {
    phoneme: "k",
    form: "cc",
    origin: 3,
    frequency: 1,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "k",
    form: "lk",
    origin: 3,
    frequency: 4,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "k",
    form: "qu",
    origin: 3,
    frequency: 2,
    invalidPositions: ["coda"],
  },
  {
    phoneme: "k",
    form: "q",
    origin: 3,
    frequency: 1,
    invalidPositions: ["onset"],
  },

  // g: go
  { phoneme: "g", form: "g", origin: 3, frequency: 10, invalidPositions: [] },
  {
    phoneme: "g",
    form: "gg",
    origin: 3,
    frequency: 2,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "g",
    form: "gh",
    origin: 3,
    frequency: 2,
    invalidPositions: ["onset"],
  },
  {
    phoneme: "g",
    form: "gu",
    origin: 3,
    frequency: 1,
    invalidPositions: ["coda"],
  },
  {
    phoneme: "g",
    form: "gue",
    origin: 3,
    frequency: 3,
    invalidPositions: ["onset"],
  },
];

export { ORIGINS, graphemes };
