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

export interface RootRimePolicy {
  readonly nucleusCoda?: BannedNucleusCodaPairs;
  readonly followingOnset?: BannedNucleusCodaPairs;
  readonly onsetRime?: OnsetRimeBans;
}

export function buildRootRimePolicy(constraints: CodaConstraints | undefined): RootRimePolicy {
  const pairs = constraints?.bannedNucleusCodaCombinations;
  return {
    nucleusCoda: buildBannedNucleusPairs(pairs),
    followingOnset: buildBannedNucleusPairs(pairs, true),
    onsetRime: buildOnsetRimeBans(constraints?.bannedOnsetRimeCombinations),
  };
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
  const indexed = bans?.[part];
  if (!indexed) return undefined;
  const last = onset?.at(-1);
  return last ? indexed.get(last.sound) : undefined;
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
  return conflictingCodaIndex(nucleus, coda, bannedPairs) === -1;
}

function conflictingCodaIndex(nucleus: string, coda: readonly Phoneme[], pairs?: BannedNucleusCodaPairs): number {
  const excluded = pairs?.get(nucleus);
  return excluded ? coda.findIndex(phoneme => excluded.has(phoneme.sound)) : -1;
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

export function permitsRootNucleus(
  sound: string,
  syllable: Syllable,
  followingOnset: readonly Phoneme[] | undefined,
  policy: RootRimePolicy,
): boolean {
  return rootNucleusRejection(sound, syllable, followingOnset, policy) === undefined;
}

type NucleusRejection = { kind: "onset-rime"; onset: string }
  | { kind: "nucleus-coda"; codaIndex: number }
  | { kind: "nucleus-onset"; onset: string };

function rootNucleusRejection(
  sound: string,
  syllable: Syllable,
  followingOnset: readonly Phoneme[] | undefined,
  policy: RootRimePolicy,
): NucleusRejection | undefined {
  if (!isNucleusCompatibleWithOnset(sound, syllable.onset, policy.onsetRime)) {
    return { kind: "onset-rime", onset: syllable.onset[syllable.onset.length - 1].sound };
  }
  const codaIndex = conflictingCodaIndex(sound, syllable.coda, policy.nucleusCoda);
  if (codaIndex !== -1) return { kind: "nucleus-coda", codaIndex };
  const next = followingOnset?.[0];
  if (next && !isNucleusCompatibleWithFollowingOnset(sound, syllable.coda, followingOnset, policy.followingOnset)) {
    return { kind: "nucleus-onset", onset: next.sound };
  }
  return undefined;
}

export function assertRootRimeCompatibility(
  syllables: readonly Syllable[],
  policy: RootRimePolicy,
): void {
  if (!policy.nucleusCoda?.size && !policy.followingOnset?.size && !policy.onsetRime) return;
  for (const [si, syllable] of syllables.entries()) {
    const codaBans = excludedAfterOnset(syllable.onset, "coda", policy.onsetRime);
    const onsetBanned = codaBans && syllable.coda.find(phoneme => codaBans.has(phoneme.sound));
    if (onsetBanned) {
      throw new Error(`Excluded lexical-root onset/rime pair /${syllable.onset.at(-1)!.sound}/ + /${onsetBanned.sound}/ at syllable ${si}.`);
    }
    for (const [ni, nucleus] of syllable.nucleus.entries()) {
      const nextOnset = ni === syllable.nucleus.length - 1 ? syllables[si + 1]?.onset : undefined;
      const rejection = rootNucleusRejection(nucleus.sound, syllable, nextOnset, policy);
      if (rejection?.kind === "onset-rime") {
        throw new Error(`Excluded lexical-root onset/rime pair /${rejection.onset}/ + /${nucleus.sound}/ at syllable ${si}.`);
      }
      if (rejection?.kind === "nucleus-coda") {
        const ci = rejection.codaIndex;
        throw new Error(`Excluded lexical-root nucleus/coda pair /${nucleus.sound}/ + /${syllable.coda[ci].sound}/ at syllable ${si}, nucleus ${ni}, coda ${ci}.`);
      }
      if (rejection?.kind === "nucleus-onset") {
        throw new Error(`Excluded lexical-root nucleus/onset pair /${nucleus.sound}/ + /${rejection.onset}/ at syllables ${si}-${si + 1}.`);
      }
    }
  }
}
