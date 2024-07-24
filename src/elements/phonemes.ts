export interface Phoneme {
  sound: string;
  type: "vowel" | "consonant";
  sonority: number;
  complexity: number;
  // weightings of the phoneme appearing in the respective position
  nucleus?: number; 
  onset?: number;
  coda?: number;
}

export const phonemes = [
  // Vowels
  // i: sheep
  { sound: "i", type: "vowel", sonority: 7, complexity: 1, nucleus: 361 },
  // ɪ: sit
  { sound: "ɪ", type: "vowel", sonority: 7, complexity: 1, nucleus: 632 },
  // e: red
  { sound: "e", type: "vowel", sonority: 7, complexity: 1, nucleus: 100 },
  // ɛ: let
  { sound: "ɛ", type: "vowel", sonority: 7, complexity: 3, nucleus: 286 },
  // æ: cat
  { sound: "æ", type: "vowel", sonority: 7, complexity: 1, nucleus: 210 },
  // ɑ: father
  { sound: "ɑ", type: "vowel", sonority: 7, complexity: 1, nucleus: 100 },
  // ɔ: ball
  { sound: "ɔ", type: "vowel", sonority: 7, complexity: 1, nucleus: 100 },
  // o: hope
  { sound: "o", type: "vowel", sonority: 7, complexity: 1, nucleus: 130 },
  // ʊ: book
  { sound: "ʊ", type: "vowel", sonority: 7, complexity: 1, nucleus: 70 },
  // u: blue
  { sound: "u", type: "vowel", sonority: 7, complexity: 1, nucleus: 193 },
  // ʌ: cup
  { sound: "ʌ", type: "vowel", sonority: 7, complexity: 1, nucleus: 80 },
  // ə: the
  { sound: "ə", type: "vowel", sonority: 7, complexity: 1, nucleus: 1150 },
  // aɪ: the
  { sound: "aɪ", type: "vowel", sonority: 7, complexity: 2, nucleus: 50 },
  // aʊ: now
  { sound: "aʊ", type: "vowel", sonority: 7, complexity: 2, nucleus: 30 },
  // oɪ: boy
  { sound: "ɔɪ", type: "vowel", sonority: 7, complexity: 2, nucleus: 30 },
  // ɪə: coin
  { sound: "ɪə", type: "vowel", sonority: 7, complexity: 2, nucleus: 30 },
  // eɪ: day
  { sound: "eɪ", type: "vowel", sonority: 7, complexity: 2, nucleus: 50 },
  // ɑʊ: now
  { sound: "ɑʊ", type: "vowel", sonority: 7, complexity: 2, nucleus: 50 },
  // ɜ: bed, said, execute
  { sound: "ɜ", type: "vowel", sonority: 7, complexity: 1, nucleus: 140 },
  // ɚ: her, letter
  { sound: "ɚ", type: "vowel", sonority: 7, complexity: 1, nucleus: 50 },

  // Glides
  { sound: "j", type: "glide", sonority: 6, complexity: 2, onset: 40, coda: 20 },
  { sound: "w", type: "glide", sonority: 6, complexity: 2, onset: 165, coda: 30 },

  // Liquids
  { sound: "l", type: "liquid", sonority: 5, complexity: 2, onset: 200, coda: 200 },
  { sound: "r", type: "liquid", sonority: 5, complexity: 2, onset: 500, coda: 100 },

  // Nasals
  { sound: "m", type: "nasal", sonority: 4, complexity: 1, onset: 100, coda: 176 },
  { sound: "n", type: "nasal", sonority: 4, complexity: 1, onset: 350, coda: 350 },
  { sound: "ŋ", type: "nasal", sonority: 4, complexity: 1, onset: 10, coda: 70 },

  // Fricatives
  {
    sound: "f",
    type: "fricative",
    sonority: 3,
    complexity: 1,
    onset: 100,
    coda: 35,
  },
  {
    sound: "v",
    type: "fricative",
    sonority: 3,
    complexity: 1,
    onset: 150,
    coda: 50,
  },
  {
    sound: "θ",
    type: "fricative",
    sonority: 3,
    complexity: 2,
    onset: 50,
    coda: 50,
  }, // as in "think"
  {
    sound: "ð",
    type: "fricative",
    sonority: 3,
    complexity: 1,
    onset: 250,
    coda: 50,
  }, // as in "this"
  {
    sound: "s",
    type: "fricative",
    sonority: 3,
    complexity: 1,
    onset: 300,
    coda: 175,
  }, // as in "see"
  {
    sound: "z",
    type: "fricative",
    sonority: 3,
    complexity: 2,
    onset: 200,
    coda: 75,
  }, // as in "zebra"
  {
    sound: "ʃ",
    type: "fricative",
    sonority: 3,
    complexity: 1,
    onset: 35,
    coda: 5,
  }, // as in "she"
  {
    sound: "ʒ",
    type: "fricative",
    sonority: 3,
    complexity: 1,
    onset: 10,
    coda: 10,
  }, // as in "measure"
  {
    sound: "h",
    type: "fricative",
    sonority: 3,
    complexity: 1,
    onset: 120,
    coda: 0,
  }, // as in "he"

  // Affricates
  {
    sound: "tʃ",
    type: "affricate",
    sonority: 2,
    complexity: 2,
    onset: 40,
    coda: 30,
  },
  {
    sound: "dʒ",
    type: "affricate",
    sonority: 2,
    complexity: 2,
    onset: 30,
    coda: 20,
  },

  // Plosives
  {
    sound: "p",
    type: "plosive",
    sonority: 1,
    complexity: 1,
    onset: 165,
    coda: 50,
  },
  {
    sound: "b",
    type: "plosive",
    sonority: 1,
    complexity: 1,
    onset: 160,
    coda: 20,
  },
  {
    sound: "t",
    type: "plosive",
    sonority: 1,
    complexity: 1,
    onset: 350,
    coda: 350,
  }, // as in "top"
  {
    sound: "d",
    type: "plosive",
    sonority: 1,
    complexity: 1,
    onset: 210,
    coda: 210,
  }, // as in "dog"
  {
    sound: "k",
    type: "plosive",
    sonority: 1,
    complexity: 1,
    onset: 220,
    coda: 100,
  }, // as in "cat"
  {
    sound: "g",
    type: "plosive",
    sonority: 1,
    complexity: 1,
    onset: 150,
    coda: 20,
  }, // as in "go"
];

export interface Cluster {
  sounds: string[];
  onset: number;
  coda: number;
}

export const clusters: Cluster[] = [
  { sounds: ["b", "l"], onset: 300, coda: 0 },   // blue, blend
  { sounds: ["b", "r"], onset: 350, coda: 0 },   // bread, bring
  { sounds: ["b", "z"], onset: 0, coda: 100 },   // robs, grabs
  { sounds: ["d", "r"], onset: 500, coda: 0 },   // drive, dream
  { sounds: ["d", "w"], onset: 50, coda: 0 },    // dwell, dwarf
  { sounds: ["d", "z"], onset: 0, coda: 300 },   // beds, lads
  { sounds: ["f", "l"], onset: 400, coda: 0 },   // fly, flame
  { sounds: ["f", "r"], onset: 450, coda: 0 },   // free, from
  { sounds: ["f", "t"], onset: 0, coda: 350 },   // lift, soft
  { sounds: ["f", "t", "s"], onset: 0, coda: 250 }, // lifts, shifts
  { sounds: ["g", "l"], onset: 200, coda: 0 },   // glass, glow
  { sounds: ["g", "r"], onset: 400, coda: 0 },   // green, grow
  { sounds: ["g", "w"], onset: 30, coda: 0 },    // Gwen, guano
  { sounds: ["g", "z"], onset: 0, coda: 100 },   // bags, digs
  { sounds: ["k", "l"], onset: 250, coda: 0 },   // clean, close
  { sounds: ["k", "r"], onset: 300, coda: 0 },   // cry, cream
  { sounds: ["k", "s"], onset: 0, coda: 400 },   // backs, licks
  { sounds: ["k", "s", "t"], onset: 0, coda: 300 }, // next, text
  { sounds: ["k", "t"], onset: 0, coda: 350 },   // act, fact
  { sounds: ["k", "w"], onset: 150, coda: 0 },   // quick, queen
  { sounds: ["l", "d"], onset: 0, coda: 800 },   // old, cold
  { sounds: ["l", "d", "z"], onset: 0, coda: 250 }, // fields, holds
  { sounds: ["l", "f"], onset: 0, coda: 100 },   // self, gulf
  { sounds: ["l", "t"], onset: 0, coda: 500 },   // belt, salt
  { sounds: ["l", "z"], onset: 0, coda: 300 },   // falls, tells
  { sounds: ["l", "θ"], onset: 0, coda: 100 },   // health, wealth
  { sounds: ["m", "d"], onset: 0, coda: 250 },   // seemed, dreamed
  { sounds: ["m", "p"], onset: 100, coda: 400 }, // lamp, jump
  { sounds: ["m", "z"], onset: 0, coda: 200 },   // homes, times
  { sounds: ["n", "d"], onset: 100, coda: 1200 }, // and, hand
  { sounds: ["n", "d", "z"], onset: 0, coda: 300 }, // hands, lands
  { sounds: ["n", "k", "t"], onset: 0, coda: 250 }, // instinct, distinct
  { sounds: ["n", "s"], onset: 50, coda: 600 },  // sense, dense
  { sounds: ["n", "s", "t"], onset: 0, coda: 350 }, // against, fenced
  { sounds: ["n", "t"], onset: 50, coda: 1000 }, // want, tent
  { sounds: ["n", "z"], onset: 0, coda: 500 },   // runs, cans
  { sounds: ["n", "θ"], onset: 0, coda: 100 },   // month, tenth
  { sounds: ["p", "l"], onset: 500, coda: 0 },   // play, please
  { sounds: ["p", "r"], onset: 550, coda: 0 },   // price, proud
  { sounds: ["p", "s"], onset: 0, coda: 300 },   // stops, helps
  { sounds: ["p", "t"], onset: 0, coda: 300 },   // apt, kept
  { sounds: ["p", "t", "s"], onset: 0, coda: 200 }, // adapts, concepts
  { sounds: ["r", "d"], onset: 0, coda: 400 },   // hard, card
  { sounds: ["r", "k", "s"], onset: 0, coda: 200 }, // works, perks
  { sounds: ["r", "l"], onset: 0, coda: 200 },   // girl, curl
  { sounds: ["r", "m"], onset: 0, coda: 250 },   // arm, form
  { sounds: ["r", "n"], onset: 0, coda: 250 },   // born, turn
  { sounds: ["r", "s"], onset: 0, coda: 350 },   // horse, course
  { sounds: ["r", "t"], onset: 0, coda: 450 },   // art, part
  { sounds: ["r", "t", "s"], onset: 0, coda: 300 }, // parts, starts
  { sounds: ["r", "z"], onset: 0, coda: 300 },   // cars, doors
  { sounds: ["s", "f"], onset: 50, coda: 0 },    // sphere, sphinx
  { sounds: ["s", "k"], onset: 400, coda: 200 }, // sky, ask
  { sounds: ["s", "k", "r"], onset: 250, coda: 0 }, // scream, scratch
  { sounds: ["s", "k", "w"], onset: 150, coda: 0 }, // square, squeeze
  { sounds: ["s", "l"], onset: 300, coda: 0 },   // sleep, slide
  { sounds: ["s", "m"], onset: 200, coda: 0 },   // small, smile
  { sounds: ["s", "n"], onset: 150, coda: 0 },   // snow, snail
  { sounds: ["s", "p"], onset: 600, coda: 200 }, // speak, sport
  { sounds: ["s", "p", "l"], onset: 250, coda: 0 }, // splash, split
  { sounds: ["s", "p", "r"], onset: 300, coda: 0 }, // spring, spray
  { sounds: ["s", "t"], onset: 1500, coda: 1000 }, // stay, best
  { sounds: ["s", "t", "r"], onset: 600, coda: 0 }, // strong, street
  { sounds: ["s", "w"], onset: 200, coda: 0 },   // sweet, swim
  { sounds: ["t", "r"], onset: 700, coda: 0 },   // tree, try
  { sounds: ["t", "s"], onset: 0, coda: 500 },   // cats, hits
  { sounds: ["t", "w"], onset: 150, coda: 0 },   // twin, twelve
  { sounds: ["v", "d"], onset: 0, coda: 250 },   // lived, loved
  { sounds: ["v", "z"], onset: 0, coda: 100 },   // loves, moves
  { sounds: ["z", "d"], onset: 0, coda: 250 },   // buzzed, fazed
  { sounds: ["ð", "d"], onset: 0, coda: 100 },   // bathed, soothed
  { sounds: ["θ", "r"], onset: 200, coda: 0 },   // three, throw
  { sounds: ["θ", "s"], onset: 0, coda: 150 },   // months, fifths
  { sounds: ["ŋ", "d"], onset: 0, coda: 250 },   // banged, hanged
  { sounds: ["ŋ", "k"], onset: 0, coda: 400 },   // think, bank
  { sounds: ["ŋ", "k", "s"], onset: 0, coda: 200 }, // thanks, banks
  { sounds: ["ŋ", "z"], onset: 0, coda: 200 },   // sings, brings
  { sounds: ["ʃ", "r"], onset: 100, coda: 0 },   // shrimp, shrink
  { sounds: ["ʒ", "d"], onset: 0, coda: 100 },   // garaged, massaged
];

// https://www.researchgate.net/figure/Frequency-of-two-final-consonant-clusters_tbl3_340269369