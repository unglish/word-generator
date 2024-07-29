export interface Phoneme {
  sound: string;
  type: "vowel" | "glide" | "liquid" | "nasal" | "fricative" | "affricate" | "plosive";
  // weightings of the phoneme appearing in the respective position
  nucleus?: number; 
  onset?: number;
  coda?: number;
  // weighting of appearing at the start or end of a word
  start?: number;
  end?: number;
}

export interface Grapheme {
  phoneme: string;
  form: string;
  origin: number;
  frequency: number;
  invalidPositions?: string[];
  // weighting of appearing at the start or end of a word
  start?: number;
  middle?: number;
  end?: number;
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