import type { LanguageConfig } from "../../src/config/language.js";
import { buildRuntime } from "../../src/core/generate.js";
import { validateJunction } from "../../src/core/junction.js";
import { isOrdinaryClusterCandidate } from "../../src/core/legacy-weighted.js";
import { isNucleusCompatibleWithCoda, isNucleusCompatibleWithFollowingOnset, isNucleusCompatibleWithOnset } from "../../src/core/rime-compatibility.js";
import { noDraws } from "../../src/core/stage-streams.js";
import type { ObservedWordInput } from "../../src/phonology/identity.js";
import type { ClusterContext } from "../../src/types.js";
import { mapReferenceTokens, type MappedPhone, type VarietyAdapter } from "./variety-adapter.js";

export const SYLLABIFICATION_VERSION = "root-boundaries-v1";
export const BASELINE_POLICY = "304";
export const POLICIES = [BASELINE_POLICY, "audited", "audited-min3", "config-legal"] as const;
export type Policy = typeof POLICIES[number];
export const CMU_ROOT_SYLLABIFICATION_V1 = {
  version: SYLLABIFICATION_VERSION,
  policy: "audited-min3",
  onsetSupport: { unit: "distinct-audited-root-spellings", minimum: 3, emptyOnset: "always-permitted" },
  tieBreak: "longest-licensed-onset",
  unsupported: "unavailable",
} as const;

export interface SyllableIndices {
  onset: number[];
  nucleus: number[];
  coda: number[];
}

export interface Split {
  codaSize: number;
  onsetSize: number;
  licensed: boolean;
}

export interface Boundary {
  leftNucleus: number;
  rightNucleus: number;
  cluster: number[];
  splits: Split[];
  chosenCodaSize: number | null;
}

export type Syllabification =
  | { status: "inferred"; policy: Policy; boundaries: Boundary[]; syllables: SyllableIndices[] }
  | { status: "unavailable"; policy: Policy; reason: "missing-or-complex-nucleus" | "unknown-token" | "no-licensed-split"; boundaries: Boundary[] }
  | { status: "supplied"; syllables: SyllableIndices[] };

export interface OnsetInventories {
  frozen: ReadonlySet<string>;
  audited: ReadonlySet<string>;
  minimumThree: ReadonlySet<string>;
  configLicense: ClusterLicense;
}

export function onsetInventories(frozen: readonly string[], pronunciations: Iterable<readonly MappedPhone[]>,
  configLicense: ClusterLicense): OnsetInventories {
  const counts = new Map<string, number>();
  for (const phones of pronunciations) {
    const firstVowel = phones.findIndex(phone => phone.kind === "vowel");
    if (firstVowel < 0 || phones.slice(0, firstVowel).some(phone => phone.comparison === null)) {
      throw new Error("The audited onset population requires a complete initial onset and a source vowel.");
    }
    const key = phones.slice(0, firstVowel).map(phone => phone.comparison).join(" ");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const { minimum } = CMU_ROOT_SYLLABIFICATION_V1.onsetSupport;
  const minimumThree = [...counts].filter(([, count]) => count >= minimum).map(([onset]) => onset);
  return { frozen: new Set(frozen), audited: new Set(["", ...counts.keys()]),
    minimumThree: new Set(["", ...minimumThree]), configLicense };
}

interface MedialSplit {
  leftNucleus: MappedPhone;
  coda: readonly MappedPhone[];
  onset: readonly MappedPhone[];
  rightNucleus: MappedPhone;
  syllableCount: number;
}

type ClusterLicense = (split: MedialSplit) => boolean;

export const CONFIG_MEDIAL_CHECK = {
  policy: "config-legal",
  scope: "one medial split between two nuclei",
  clusters: "ordinary legacy-weighted coda and onset candidates within the root planner's length limits",
  junction: "preceding-coda exclusions, configured boundary bans and validateJunction",
  vowels: "nucleus/coda, open nucleus/following onset, onset/following nucleus. Use the generated inventory ID or require all reference readings to pass.",
} as const;

function everyNucleusReading(phone: MappedPhone, allows: (sound: string) => boolean) {
  const { fit } = phone;
  if (fit.status === "permitted") return allows(fit.sound);
  if (fit.status !== "ambiguous") return false;
  const source = fit.alternatives.find(reading => reading.identityId === phone.sourceIdentityId);
  if (source) return allows(source.sound);
  return fit.alternatives.length > 0 && fit.alternatives.every(({ sound }) => allows(sound));
}

export function configClusterLicense(config: LanguageConfig): ClusterLicense {
  const runtime = buildRuntime(config);
  const { rimes } = runtime.nucleusRepair;
  const inventory = {
    coda: new Map(runtime.positionPhonemes.coda.map(p => [p.sound, p])),
    onset: new Map(runtime.positionPhonemes.onset.map(p => [p.sound, p])),
    nucleus: new Set(runtime.positionPhonemes.nucleus.map(p => p.sound)),
  };
  const noExclusions = new Set<string>();
  const rand = noDraws("Boundary inference cannot consume generator randomness.");
  const { maxOnsetLength, maxCodaLength } = runtime.rootLengthPolicy;

  function licensedCluster(tokens: readonly MappedPhone[], position: "onset" | "coda", syllableCount: number, ignoreSet: ReadonlySet<string>) {
    const maxLength = position === "onset" ? maxOnsetLength : maxCodaLength;
    if (tokens.length > maxLength) return null;
    const context: ClusterContext = { position, cluster: [], clusterSounds: [], ignoreSet,
      isStartOfWord: false, isEndOfWord: false, rand, maxLength, syllableCount };
    for (const token of tokens) {
      const phone = token.fit.status === "permitted" && inventory[position].get(token.fit.sound);
      if (!phone || !isOrdinaryClusterCandidate(phone, runtime, context)) return null;
      context.cluster.push(phone);
      context.clusterSounds.push(phone.sound);
    }
    return context.cluster;
  }

  return ({ leftNucleus, coda: codaTokens, onset: onsetTokens, rightNucleus, syllableCount }) => {
    const coda = licensedCluster(codaTokens, "coda", syllableCount, noExclusions);
    if (!coda) return false;
    const onset = licensedCluster(onsetTokens, "onset", syllableCount, new Set(coda.map(p => p.sound)));
    if (!onset) return false;
    const last = coda.at(-1);
    const first = onset[0];
    if (last && first && runtime.bannedSet?.has(`${last.sound}|${first.sound}`)) return false;
    return validateJunction(coda, onset, config)
      && everyNucleusReading(leftNucleus, sound => inventory.nucleus.has(sound)
        && isNucleusCompatibleWithCoda(sound, coda, rimes.nucleusCoda)
        && isNucleusCompatibleWithFollowingOnset(sound, coda, onset, rimes.followingOnset))
      && everyNucleusReading(rightNucleus, sound => inventory.nucleus.has(sound)
        && isNucleusCompatibleWithOnset(sound, onset, rimes.onsetRime));
  };
}

function licensesOnset(onset: readonly MappedPhone[], policy: Exclude<Policy, "config-legal">, onsets: OnsetInventories) {
  const inventory = policy === BASELINE_POLICY ? onsets.frozen : policy === "audited" ? onsets.audited : onsets.minimumThree;
  return inventory.has(onset.map(phone => phone.comparison).join(" "));
}

function indices(start: number, end: number): number[] {
  return Array.from({ length: end - start }, (_, i) => i + start);
}

function inferBoundary(phones: readonly MappedPhone[], leftNucleus: number, rightNucleus: number,
  syllableCount: number, policy: Policy, onsets: OnsetInventories): Boundary {
  const cluster = phones.slice(leftNucleus + 1, rightNucleus);
  const splits = Array.from({ length: cluster.length + 1 }, (_, codaSize) => {
    const onset = cluster.slice(codaSize);
    const licensed = policy === "config-legal" ? onsets.configLicense({
      leftNucleus: phones[leftNucleus], coda: cluster.slice(0, codaSize), onset, rightNucleus: phones[rightNucleus], syllableCount,
    }) : licensesOnset(onset, policy, onsets);
    return { codaSize, onsetSize: onset.length, licensed };
  });
  return { leftNucleus, rightNucleus, cluster: indices(leftNucleus + 1, rightNucleus), splits,
    chosenCodaSize: splits.find(split => split.licensed)?.codaSize ?? null };
}

export function inferSyllables(phones: readonly MappedPhone[], policy: Policy, onsets: OnsetInventories): Exclude<Syllabification, { status: "supplied" }> {
  if (phones.some(phone => phone.kind === null || (phone.kind === "consonant" && phone.comparison === null && policy !== "config-legal"))) {
    return { status: "unavailable", policy, reason: "unknown-token", boundaries: [] };
  }
  const nuclei = phones.flatMap((phone, index) => phone.kind === "vowel" ? [index] : []);
  if (!nuclei.length) return { status: "unavailable", policy, reason: "missing-or-complex-nucleus", boundaries: [] };
  const boundaries = nuclei.slice(1).map((right, index) => inferBoundary(phones, nuclei[index], right, nuclei.length, policy, onsets));
  if (boundaries.some(boundary => boundary.chosenCodaSize === null)) {
    return { status: "unavailable", policy, reason: "no-licensed-split", boundaries };
  }
  let start = 0;
  const syllables = nuclei.map((vowel, index) => {
    const chosen = boundaries[index]?.chosenCodaSize;
    const end = chosen == null ? phones.length : vowel + 1 + chosen;
    const syllable = { onset: indices(start, vowel), nucleus: [vowel], coda: indices(vowel + 1, end) };
    start = end;
    return syllable;
  });
  return { status: "inferred", policy, boundaries, syllables };
}

export function suppliedSyllables(root: ObservedWordInput): Extract<Syllabification, { status: "supplied" }> {
  let end = 0;
  return { status: "supplied", syllables: root.syllables.map(({ onset, nucleus, coda }) => {
    const start = end;
    const vowel = start + onset.length;
    const tail = vowel + nucleus.length;
    end = tail + coda.length;
    return { onset: indices(start, vowel), nucleus: indices(vowel, tail), coda: indices(tail, end) };
  }) };
}

/** Do not use an unsupported token to manufacture adjacency between its neighbors. */
export function nativePairs(phones: readonly MappedPhone[]): Array<[string, string]> {
  const slots = ["#", ...phones.map(phone => phone.kind === null ? null : phone.raw), "#"];
  return slots.slice(1).flatMap((right, index) => {
    const left = slots[index];
    return left === null || right === null || (left === "#" && right === "#") ? [] : [[left, right]];
  });
}

type ReferenceBoundaries =
  | { kind: "infer"; policy: Policy; inventories: OnsetInventories }
  | { kind: "supplied"; syllables: SyllableIndices[] };

function checkSuppliedSyllables(phones: readonly MappedPhone[], syllables: readonly SyllableIndices[]) {
  if (!syllables.length) throw new Error("Supplied reference syllables must be nonempty.");
  let expectedIndex = 0;
  for (const { onset, nucleus, coda } of syllables) {
    if (!nucleus.length) throw new Error("A supplied reference syllable must contain a nucleus.");
    for (const [indices, kind] of [[onset, "consonant"], [nucleus, "vowel"], [coda, "consonant"]] as const) {
      for (const index of indices) {
        const phone = phones[index];
        if (!phone || index !== expectedIndex || (phone.kind !== null && phone.kind !== kind)) {
          throw new Error("Supplied reference slots must preserve all source phones in order and in compatible slots.");
        }
        expectedIndex++;
      }
    }
  }
  if (expectedIndex !== phones.length) throw new Error("Supplied reference slots omit source phones.");
}

/** Selected-policy E2 input. Retain alternatives for inferred boundaries and trust explicit source slots after validation. */
export function mapReferencePronunciation(tokens: readonly string[], adapter: VarietyAdapter, boundaries: ReferenceBoundaries) {
  const phones = mapReferenceTokens(tokens, adapter);
  let syllabification: Syllabification;
  if (boundaries.kind === "supplied") {
    checkSuppliedSyllables(phones, boundaries.syllables);
    syllabification = { status: "supplied", syllables: structuredClone(boundaries.syllables) };
  } else {
    syllabification = inferSyllables(phones, boundaries.policy, boundaries.inventories);
  }
  return { adapter: adapter.descriptor.version, syllabification, phones };
}
