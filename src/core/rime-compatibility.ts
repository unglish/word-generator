import type { Phoneme, Syllable } from "../types.js";

export type BannedNucleusCodaPairs = ReadonlyMap<string, ReadonlySet<string>>;

/** Configured exclusions apply to any nucleus/coda pair within a syllable. */
export function isNucleusCodaPairAllowed(
  nucleus: string,
  coda: string,
  bannedPairs?: BannedNucleusCodaPairs,
): boolean {
  return !bannedPairs?.get(nucleus)?.has(coda);
}

export function isNucleusCompatibleWithCoda(
  nucleus: string,
  coda: readonly Phoneme[],
  bannedPairs?: BannedNucleusCodaPairs,
): boolean {
  return coda.every(phoneme => isNucleusCodaPairAllowed(nucleus, phoneme.sound, bannedPairs));
}

/** Check the lexical root before spelling, surface reduction, and affix assembly. */
export function assertRootRimeCompatibility(syllables: readonly Syllable[], bannedPairs?: BannedNucleusCodaPairs): void {
  if (!bannedPairs?.size) return;
  for (const [si, syllable] of syllables.entries()) {
    for (const [ni, nucleus] of syllable.nucleus.entries()) {
      for (const [ci, coda] of syllable.coda.entries()) {
        if (!isNucleusCodaPairAllowed(nucleus.sound, coda.sound, bannedPairs)) {
          throw new Error(`Excluded lexical-root nucleus/coda pair /${nucleus.sound}/ + /${coda.sound}/ at syllable ${si}, nucleus ${ni}, coda ${ci}.`);
        }
      }
    }
  }
}
