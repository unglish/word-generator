import type { LanguageConfig } from "../../src/config/language.js";
import { validateJunction } from "../../src/core/junction.js";
import { clusterCandidateRejection } from "../../src/core/morphology/cluster-legality.js";
import { buildMorphophonemicGuardRuntime } from "../../src/core/morphology/morphophonemic-guard.js";
import { noDraws } from "../../src/core/stage-streams.js";
import type { ObservedWordInput } from "../../src/phonology/identity.js";
import type { Phoneme } from "../../src/types.js";
import type { MappedPhone, VarietyAdapter } from "./variety-adapter.js";

export const SYLLABIFICATION_VERSION = "root-boundaries-v1";
export const POLICIES = ["304", "audited", "audited-min3", "config-legal"] as const;
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
  const minimumThree = [...counts].filter(([, count]) => count >= 3).map(([onset]) => onset);
  return { frozen: new Set(frozen), audited: new Set(["", ...counts.keys()]),
    minimumThree: new Set(["", ...minimumThree]), configLicense };
}

type ClusterLicense = (coda: readonly MappedPhone[], onset: readonly MappedPhone[]) => boolean;

export function configClusterLicense(config: LanguageConfig): ClusterLicense {
  const runtime = buildMorphophonemicGuardRuntime(config);
  const ignoreSet = new Set<string>();
  const rand = noDraws("Boundary inference cannot consume generator randomness.");
  const maxOnset = runtime.clusterLimits?.maxOnset ?? config.syllableStructure.maxOnsetLength;
  const maxCoda = runtime.clusterLimits?.maxCoda ?? config.syllableStructure.maxCodaLength;

  function licensedCluster(tokens: readonly MappedPhone[], position: "onset" | "coda"): Phoneme[] | null {
    const cluster: Phoneme[] = [];
    const clusterSounds: string[] = [];
    const maxLength = position === "onset" ? maxOnset : maxCoda;
    if (tokens.length > maxLength && (position === "onset" || !runtime.clusterLimits)) return null;
    for (const token of tokens) {
      const phone = token.fit.status === "permitted" && runtime.phonemeBySound.get(token.fit.sound);
      if (!phone) return null;
      if (clusterCandidateRejection(phone, runtime, { position, cluster, clusterSounds, ignoreSet,
        isStartOfWord: false, isEndOfWord: false, rand, maxLength, syllableCount: 2 })) return null;
      cluster.push(phone);
      clusterSounds.push(phone.sound);
    }
    return cluster;
  }

  return (codaTokens, onsetTokens) => {
    const coda = licensedCluster(codaTokens, "coda");
    const onset = licensedCluster(onsetTokens, "onset");
    if (!coda || !onset) return false;
    const last = coda.at(-1);
    const first = onset[0];
    if (last && first && runtime.bannedSet?.has(`${last.sound}|${first.sound}`)) return false;
    return validateJunction(coda, onset, config);
  };
}

function licensesSplit(cluster: readonly MappedPhone[], codaSize: number, policy: Policy, onsets: OnsetInventories) {
  const onset = cluster.slice(codaSize);
  if (policy === "config-legal") {
    return onsets.configLicense(cluster.slice(0, codaSize), onset);
  }
  const inventory = policy === "304" ? onsets.frozen : policy === "audited" ? onsets.audited : onsets.minimumThree;
  return inventory.has(onset.map(phone => phone.comparison).join(" "));
}

function indices(start: number, end: number): number[] {
  return Array.from({ length: end - start }, (_, i) => i + start);
}

function inferBoundary(phones: readonly MappedPhone[], leftNucleus: number, rightNucleus: number,
  policy: Policy, onsets: OnsetInventories): Boundary {
  const cluster = phones.slice(leftNucleus + 1, rightNucleus);
  const splits = Array.from({ length: cluster.length + 1 }, (_, codaSize) => ({
    codaSize, onsetSize: cluster.length - codaSize,
    licensed: licensesSplit(cluster, codaSize, policy, onsets),
  }));
  return { leftNucleus, rightNucleus, cluster: indices(leftNucleus + 1, rightNucleus), splits,
    chosenCodaSize: splits.find(split => split.licensed)?.codaSize ?? null };
}

export function inferSyllables(phones: readonly MappedPhone[], policy: Policy, onsets: OnsetInventories): Exclude<Syllabification, { status: "supplied" }> {
  if (phones.some(phone => phone.kind === null || (phone.kind === "consonant" && phone.comparison === null && policy !== "config-legal"))) {
    return { status: "unavailable", policy, reason: "unknown-token", boundaries: [] };
  }
  const nuclei = phones.flatMap((phone, index) => phone.kind === "vowel" ? [index] : []);
  if (!nuclei.length) return { status: "unavailable", policy, reason: "missing-or-complex-nucleus", boundaries: [] };
  const boundaries = nuclei.slice(1).map((right, index) => inferBoundary(phones, nuclei[index], right, policy, onsets));
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
  const phones = adapter.mapReference(tokens);
  if (phones.length !== tokens.length || !tokens.every((raw, index) => phones[index]?.index === index && phones[index]?.raw === raw)) {
    throw new Error("Reference adapters must retain every raw source token at its original index.");
  }
  let syllabification: Syllabification;
  if (boundaries.kind === "supplied") {
    checkSuppliedSyllables(phones, boundaries.syllables);
    syllabification = { status: "supplied", syllables: structuredClone(boundaries.syllables) };
  } else {
    syllabification = inferSyllables(phones, boundaries.policy, boundaries.inventories);
  }
  return { adapter: adapter.descriptor.version, syllabification, phones };
}
