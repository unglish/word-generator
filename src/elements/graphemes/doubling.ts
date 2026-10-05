import type { DoublingRealization } from "../../config/language.js";

/** Ordinary correspondences only; lexical ss readings need a separate construction. */
export const englishDoublingRealizations: DoublingRealization[] = [
  ...["b", "d", "f", "g", "l", "m", "n", "p", "r", "s", "t", "z"].map(sound => ({
    phoneme: sound, from: sound, to: sound + sound, reading: { kind: "single-phone" as const },
  })),
  { phoneme: "k", from: "c", to: "ck", reading: { kind: "single-phone" }, allowInCodaCluster: true },
  { phoneme: "k", from: "k", to: "ck", reading: { kind: "single-phone" }, allowInCodaCluster: true },
];
