import type { CodaConstraints } from "../config/language.js";
import type { Phoneme, Syllable } from "../types.js";

export type BannedNucleusCodaPairs = ReadonlyMap<string, ReadonlySet<string>>;

type NucleusCodaRule = NonNullable<CodaConstraints["bannedNucleusCodaCombinations"]>[number];
type OnsetRimeRule = NonNullable<CodaConstraints["bannedOnsetRimeCombinations"]>[number];
type RimePart = "nucleus" | "coda";

/** Last onset sound to the nucleus or coda sounds it excludes from its root syllable. */
export interface OnsetRimeBans {
  nucleus?: BannedNucleusCodaPairs;
  coda?: BannedNucleusCodaPairs;
}

/**
 * Index configured nucleus/coda rules by nucleus sound. With
 * `followingOnsetOnly`, keep only the rules that also ban the consonant as the
 * next root syllable's first onset phoneme after an open syllable.
 */
export function buildBannedNucleusPairs(
  rules: readonly NucleusCodaRule[] | undefined,
  followingOnsetOnly = false,
): Map<string, Set<string>> | undefined {
  if (!rules) return undefined;
  const map = new Map<string, Set<string>>();
  for (const { nucleus, coda, followingOnset } of rules) {
    if (followingOnsetOnly && !followingOnset) continue;
    for (const n of nucleus) {
      const banned = map.get(n) ?? new Set<string>();
      for (const c of coda) banned.add(c);
      map.set(n, banned);
    }
  }
  return followingOnsetOnly && map.size === 0 ? undefined : map;
}

function indexOnsetRimeRules(rules: readonly OnsetRimeRule[], part: RimePart): Map<string, Set<string>> | undefined {
  const map = new Map<string, Set<string>>();
  for (const rule of rules) {
    for (const onset of rule.onsetFinal) {
      for (const sound of rule[part] ?? []) {
        const banned = map.get(onset) ?? new Set<string>();
        banned.add(sound);
        map.set(onset, banned);
      }
    }
  }
  return map.size ? map : undefined;
}

/** Index configured onset/rime rules by the onset's last sound. */
export function buildOnsetRimeBans(rules: readonly OnsetRimeRule[] | undefined): OnsetRimeBans | undefined {
  if (!rules) return undefined;
  const bans = { nucleus: indexOnsetRimeRules(rules, "nucleus"), coda: indexOnsetRimeRules(rules, "coda") };
  return bans.nucleus || bans.coda ? bans : undefined;
}

/** The nucleus or coda sounds that a syllable's onset excludes, if any. */
export function excludedAfterOnset(
  onset: readonly Phoneme[] | undefined,
  part: RimePart,
  bans?: OnsetRimeBans,
): ReadonlySet<string> | undefined {
  const last = onset?.at(-1);
  return last ? bans?.[part]?.get(last.sound) : undefined;
}

export function isNucleusCompatibleWithOnset(
  nucleus: string,
  onset: readonly Phoneme[] | undefined,
  bans?: OnsetRimeBans,
): boolean {
  return !excludedAfterOnset(onset, "nucleus", bans)?.has(nucleus);
}

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

/**
 * An open syllable's nucleus is directly followed by the next root syllable's
 * first onset phoneme; a closed syllable's coda sits between them.
 */
export function isNucleusCompatibleWithFollowingOnset(
  nucleus: string,
  coda: readonly Phoneme[],
  nextOnset: readonly Phoneme[] | undefined,
  followingOnsetPairs?: BannedNucleusCodaPairs,
): boolean {
  if (coda.length > 0 || !nextOnset?.length) return true;
  return isNucleusCodaPairAllowed(nucleus, nextOnset[0].sound, followingOnsetPairs);
}

/** Check the lexical root before spelling, surface reduction, and affix assembly. */
export function assertRootRimeCompatibility(
  syllables: readonly Syllable[],
  bannedPairs?: BannedNucleusCodaPairs,
  followingOnsetPairs?: BannedNucleusCodaPairs,
  onsetRimeBans?: OnsetRimeBans,
): void {
  if (!bannedPairs?.size && !followingOnsetPairs?.size && !onsetRimeBans) return;
  for (const [si, syllable] of syllables.entries()) {
    const nucleusBans = excludedAfterOnset(syllable.onset, "nucleus", onsetRimeBans);
    const codaBans = excludedAfterOnset(syllable.onset, "coda", onsetRimeBans);
    const onsetBanned = syllable.nucleus.find(phoneme => nucleusBans?.has(phoneme.sound))
      ?? syllable.coda.find(phoneme => codaBans?.has(phoneme.sound));
    if (onsetBanned) {
      throw new Error(`Excluded lexical-root onset/rime pair /${syllable.onset.at(-1)!.sound}/ + /${onsetBanned.sound}/ at syllable ${si}.`);
    }
    for (const [ni, nucleus] of syllable.nucleus.entries()) {
      for (const [ci, coda] of syllable.coda.entries()) {
        if (!isNucleusCodaPairAllowed(nucleus.sound, coda.sound, bannedPairs)) {
          throw new Error(`Excluded lexical-root nucleus/coda pair /${nucleus.sound}/ + /${coda.sound}/ at syllable ${si}, nucleus ${ni}, coda ${ci}.`);
        }
      }
    }
    const lastNucleus = syllable.nucleus.at(-1);
    const nextOnset = syllables[si + 1]?.onset;
    if (lastNucleus && !isNucleusCompatibleWithFollowingOnset(lastNucleus.sound, syllable.coda, nextOnset, followingOnsetPairs)) {
      throw new Error(`Excluded lexical-root nucleus/onset pair /${lastNucleus.sound}/ + /${nextOnset![0].sound}/ at syllables ${si}-${si + 1}.`);
    }
  }
}
