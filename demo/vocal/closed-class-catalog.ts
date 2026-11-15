/**
 * Curated closed-class / function-word catalog for the vocal demo.
 * Entries match `englishConfig.closedClass` from the #85 / #444 channel
 * (gap-catalog shorts + productive-path shorts).
 *
 * `phonetic` is a rough English spelling cue shown in brackets next to IPA.
 */

export type ClosedClassDemoEntry = {
  name: string;
  spelling: string;
  phonemes: readonly string[];
  /** Broad IPA for display (no slashes). */
  ipa: string;
  /** Rough English phonetic cue, e.g. "uhv". */
  phonetic: string;
  /** Gap-catalog vs productive-path recovery (PR #444). */
  path: "gap" | "productive";
};

export const CLOSED_CLASS_DEMO: readonly ClosedClassDemoEntry[] = [
  { name: "be", spelling: "be", phonemes: ["b", "i:"], ipa: "bi:", phonetic: "bee", path: "gap" },
  { name: "to", spelling: "to", phonemes: ["t", "u"], ipa: "tu", phonetic: "too", path: "gap" },
  { name: "he", spelling: "he", phonemes: ["h", "i:"], ipa: "hi:", phonetic: "hee", path: "gap" },
  { name: "we", spelling: "we", phonemes: ["w", "i:"], ipa: "wi:", phonetic: "wee", path: "gap" },
  { name: "me", spelling: "me", phonemes: ["m", "i:"], ipa: "mi:", phonetic: "mee", path: "gap" },
  { name: "do", spelling: "do", phonemes: ["d", "u"], ipa: "du", phonetic: "doo", path: "gap" },
  { name: "any", spelling: "any", phonemes: ["ɛ", "n", "i:"], ipa: "ˈɛ.ni:", phonetic: "EH-nee", path: "gap" },
  { name: "of", spelling: "of", phonemes: ["ə", "v"], ipa: "əv", phonetic: "uhv", path: "productive" },
  { name: "in", spelling: "in", phonemes: ["ɪ", "n"], ipa: "ɪn", phonetic: "in", path: "productive" },
  { name: "it", spelling: "it", phonemes: ["ɪ", "t"], ipa: "ɪt", phonetic: "it", path: "productive" },
  { name: "my", spelling: "my", phonemes: ["m", "aɪ"], ipa: "maɪ", phonetic: "my", path: "productive" },
];

export function formatIpaWithPhonetic(ipa: string, phonetic: string): string {
  return `/${ipa}/ [${phonetic}]`;
}
