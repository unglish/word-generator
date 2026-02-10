import { Phoneme } from "../types.js";
export declare const sonorityToMannerOfArticulation: {
    highVowel: number;
    midVowel: number;
    lowVowel: number;
    glide: number;
    liquid: number;
    nasal: number;
    lateralApproximant: number;
    sibilant: number;
    fricative: number;
    affricate: number;
    stop: number;
};
export declare const sonorityToPlaceOfArticulation: {
    front: number;
    central: number;
    back: number;
    bilabial: number;
    labiodental: number;
    dental: number;
    alveolar: number;
    velar: number;
    postalveolar: number;
    "labial-velar": number;
    palatal: number;
    glottal: number;
};
export declare const forwardnessToPlaceOfArticulation: {
    front: number;
    central: number;
    back: number;
    bilabial: number;
    labiodental: number;
    dental: number;
    alveolar: number;
    postalveolar: number;
    palatal: number;
    "labial-velar": number;
    velar: number;
    glottal: number;
};
export declare const phonemes: Phoneme[];
export declare const phonemeMaps: {
    onset: Map<string, Phoneme[]>;
    nucleus: Map<string, Phoneme[]>;
    coda: Map<string, Phoneme[]>;
};
export declare const sonorityLevels: Map<Phoneme, number>;
export declare const invalidBoundaryClusters: RegExp[];
export declare const invalidOnsetClusters: RegExp[];
export declare const invalidCodaClusters: RegExp[];
//# sourceMappingURL=phonemes.d.ts.map