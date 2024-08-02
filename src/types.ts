export interface Phoneme {
  sound: string;
  type: "highVowel" | "midVowel" | "lowVowel" | "glide" | "liquid" | "nasal" | "sibilant" | "voicedFricative" | "voicelessFricative" | "affricate" | "voicedStop" | "voicelessStop";
  // weightings of the phoneme appearing in the respective position
  nucleus?: number; 
  onset?: number;
  coda?: number;
  tense?: boolean;
  // weighting of appearing at the start or end of a word
  startWord: number;
  midWord: number;
  endWord: number;
}

export interface Grapheme {
  phoneme: string;
  form: string;
  origin: number;
  frequency: number;
  onset?: number;
  coda?: number;
  nucleus?: number;
  cluster?: number;
  // weighting of appearing at the start or end of a word
  startWord: number;
  midWord: number;
  endWord: number;
}

export interface GenerateWordOptions {
  seed?: number;
  syllableCount?: number;
}

export interface Word {
  syllables: Syllable[];
  pronunciation: string;
  written: WrittenForm;
}

export interface Syllable {
  onset: Phoneme[];
  nucleus: Phoneme[];
  coda: Phoneme[];
}

export interface WrittenForm {
  clean: string;
  hyphenated: string;
}

export interface GenerateWordOptions {
  seed?: number;
  syllableCount?: number; // Optional specific syllable length
}

export interface Word {
  syllables: Syllable[];
  pronunciation: string;
  written: WrittenForm;
}

export interface Syllable {
  onset: Phoneme[];
  nucleus: Phoneme[];
  coda: Phoneme[];
}