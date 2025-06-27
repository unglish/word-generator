import { RandomFunction } from "./utils/random";

export interface Phoneme {
  sound: string;

  // Voicing refers to whether or not your vocal cords vibrate when you produce a sound.
  // Example:
  // When you say the sound /z/ (as in "buzz"), your vocal cords vibrate—this is a voiced sound.
  // When you say the sound /s/ (as in "hiss"), your vocal cords do not vibrate—this is a voiceless sound.
  voiced: boolean;

  // Indicates whether the phoneme is aspirated — has a small burst of air at the end (e.g., /pʰ/ in "pat")
  aspirated?: boolean;

  // Manner of articulation describes how the airflow is manipulated to produce different sounds. It’s about what your tongue, lips, and other parts of your mouth do to create the sound.
  // Example:
  // Stop: A sound where airflow is completely blocked and then released, like /p/ in "pat" or /t/ in "top."
  // Nasal: A sound where air flows out through your nose, like /m/ in "mom" or /n/ in "nose."
  // Fricative: A sound where air is forced through a narrow space, causing friction, like /f/ in "fish" or /s/ in "see."
  mannerOfArticulation:
    | "highVowel"           // Vowels: High (close)
    | "midVowel"            // Vowels: Mid
    | "lowVowel"            // Vowels: Low (open)
    | "glide"               // Approximants, semivowels (e.g., /j/, /w/)
    | "liquid"              // Lateral approximants and rhotics (e.g., /l/, /r/)
    | "nasal"               // Nasal stops (e.g., /m/, /n/, /ŋ/)
    | "fricative"           // Fricatives (voiced or voiceless, e.g., /f/, /s/)
    | "affricate"           // Affricates (e.g., /tʃ/, /dʒ/)
    | "stop"                // Stops or plosives (e.g., /p/, /t/)
    // | "tap" | "flap"        // Rapid, single contraction of the articulators (e.g., Spanish /ɾ/ - not common in English)
    // | "trill"               // Vibration of one articulator against another (e.g., Spanish /r/ - not used in English)
    // | "ejectiveStop"        // Consonants with a glottalic egressive airstream (e.g., /p’/ - not used in English)
    // | "implosiveStop"       // Consonants with a glottalic ingressive airstream (e.g., /ɓ/ - not used in English)
    // | "click"               // Consonants produced by creating a suction mechanism (e.g., in Khoisan languages - not used in English)
    // | "lateralFricative"    // Fricatives where airflow is around the sides of the tongue (e.g., Welsh /ɬ/ - not used in English)
    // | "lateralAffricate"    // Affricates with lateral release (e.g., in some Caucasian languages - not used in English)
    // | "pharyngealFricative" // Fricatives articulated with the pharynx (e.g., Arabic /ħ/ - not used in English)
    // | "uvularFricative"     // Fricatives articulated with the uvula (e.g., French /ʁ/ - not used in English)
    // | "uvularStop"          // Stops articulated with the uvula (e.g., Quechua /q/ - not used in English)
    // | "epiglottalStop"      // Stops articulated with the epiglottis (e.g., in some Semitic languages - not used in English)
    // | "epiglottalFricative" // Fricatives articulated with the epiglottis (e.g., in some Semitic languages - not used in English)
    | "sibilant"            // High-pitched fricatives (e.g., /s/, /ʃ/)
    | "lateralApproximant"; // Laterals that do not create a complete closure (e.g., /l/)

  // Place of articulation refers to the specific part of your mouth or throat where the sound is produced. It tells you where your tongue, lips, or other articulators are positioned.
  // Example:
  // Bilabial: A sound made with both lips, like /b/ in "bat" or /m/ in "mat."
  // Alveolar: A sound made with the tongue against the ridge behind your upper teeth, like /t/ in "tap" or /d/ in "dog."
  // Velar: A sound made with the back of your tongue against the soft part of the roof of your mouth, like /k/ in "cat" or /g/ in "go."
  placeOfArticulation:
    | "front"             // Vowel: Front
    | "central"           // Vowel: Central
    | "back"              // Vowel: Back
    | "bilabial"          // Consonant: Both lips (e.g., /p/, /b/)
    | "labiodental"       // Consonant: Lip and teeth (e.g., /f/, /v/)
    | "dental"            // Consonant: Tongue against teeth (e.g., /θ/, /ð/)
    | "alveolar"          // Consonant: Tongue against the alveolar ridge (e.g., /t/, /d/)
    | "postalveolar"      // Consonant: Just behind the alveolar ridge (e.g., /ʃ/, /ʒ/)
    // | "retroflex"         // Consonant: Tongue curled back (e.g., retroflex stops in some Indian languages - not used in English)
    | "palatal"           // Consonant: Tongue against the hard palate (e.g., /j/)
    | "velar"             // Consonant: Tongue against the soft palate (e.g., /k/, /g/)
    | "glottal"           // Consonant: Using the glottis (e.g., /h/, glottal stop)
    | "labial-velar"      // Consonant: Simultaneous bilabial and velar articulation (e.g., /w/)
    // | "labial-palatal"    // Consonant: Simultaneous bilabial and palatal articulation (found in some West African languages - not used in English)
    // | "pharyngeal"        // Consonant: Articulated with the pharynx (e.g., Arabic /ʕ/ - not used in English)
    // | "epiglottal"        // Consonant: Articulated with the epiglottis (found in some Semitic languages - not used in English)
    // | "uvular"            // Consonant: Articulated with the uvula (e.g., French /ʁ/, Quechua /q/ - not used in English)
    // | "alveolo-palatal";  // Consonant: Articulated with the tongue near the alveolar ridge and palate (e.g., Mandarin /tɕ/ - not used in English)

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

export interface WrittenForm {
  clean: string;
  hyphenated: string;
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
  stress?: 'ˈ' | 'ˌ' | undefined; // primary, secondary, or unstressed
}

export interface WordGenerationOptions {
  word?: Word;
  seed?: number;
  syllableCount?: number;
  rand?: RandomFunction;
}

export interface WordGenerationContext {
  word: Word;
  syllableCount: number;
  currSyllableIndex: number;
}

export interface ClusterContext {
  position: "onset" | "coda" | "nucleus";
  cluster: Phoneme[];
  ignore: string[];
  isStartOfWord: boolean;
  isEndOfWord: boolean;
  maxLength: number;
  syllableCount: number;
}