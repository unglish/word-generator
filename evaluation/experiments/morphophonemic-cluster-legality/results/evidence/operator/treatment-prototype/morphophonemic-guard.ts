import type { Phoneme, Syllable, ClusterContext } from "../types.js";
import type { LanguageConfig } from "../config/language.js";
import { clusterCandidateRejection, type ClusterValidationRuntime } from "./cluster-validation.js";
import { codaShapeRejection } from "./coda-shape.js";
import { projectMorphologyReplacement, type MorphophonemicTarget, type MorphologyPhonePosition,
  type ProposedMorphologyPhone, type MorphologyPhoneSource } from "./morphology-projection.js";
import type { AffixForm } from "./morphology/realization.js";
import type { CodaExtensionRejectionReason } from "./trace.js";

export interface MorphophonemicGuardRuntime extends ClusterValidationRuntime {
  config: Pick<LanguageConfig, "codaConstraints" | "syllableStructure">;
  positionPhonemes: Record<MorphologyPhonePosition, Phoneme[]>;
  phonemeBySound: Map<string, Phoneme>;
  allowedFinalSet?: Set<string>;
  bannedSet?: Set<string>;
}
export interface MorphophonemicRejection {
  reason: CodaExtensionRejectionReason | "inventory" | "boundary";
  syllableIndex: number;
  segment: MorphologyPhonePosition;
  index: number;
  sounds: string[];
  parts: Array<"root" | "prefix" | "suffix">;
}
export interface MorphophonemicBoundaryRepetitionLicense {
  syllableIndex: number;
  segment: MorphologyPhonePosition;
  sound: string;
  members: Array<{ index: number; source: MorphologyPhoneSource }>;
}
export interface MorphophonemicGuardResult {
  accepted: boolean;
  rootTarget: MorphophonemicTarget;
  assembledTarget: MorphophonemicTarget;
  soundBefore: string;
  soundProposed: string;
  rejections: MorphophonemicRejection[];
  boundaryRepetitionLicenses: MorphophonemicBoundaryRepetitionLicense[];
}
const NO_IGNORES: ReadonlySet<string> = new Set();
const NO_RNG = () => { throw new Error("Morphophonemic eligibility must not consume RNG."); };

function evidence(reason: MorphophonemicRejection["reason"], syllableIndex: number,
  segment: MorphologyPhonePosition, index: number, phones: readonly ProposedMorphologyPhone[]): MorphophonemicRejection {
  return { reason, syllableIndex, segment, index, sounds: phones.map(phone => phone.phoneme.sound),
    parts: phones.map(phone => phone.source.part) };
}

interface ClusterLicenseGroup { phoneme: Phoneme; members: Array<{ index: number; phone: ProposedMorphologyPhone }> }

function clusterLicenseGroups(phones: readonly ProposedMorphologyPhone[]): ClusterLicenseGroup[] {
  const groups: ClusterLicenseGroup[] = [];
  for (const [index, phone] of phones.entries()) {
    const previous = groups.at(-1);
    if (previous?.phoneme.sound === phone.phoneme.sound
      && previous.members.every(member => member.phone.source.part !== phone.source.part)) {
      previous.members.push({ index, phone });
    } else groups.push({ phoneme: phone.phoneme, members: [{ index, phone }] });
  }
  return groups;
}

/** Physical phones remain intact; mixed clusters also need an aggregate production license. */
export function evaluateMorphophonemicReplacement(rt: MorphophonemicGuardRuntime, root: readonly Syllable[],
  target: MorphophonemicTarget, replacement: Phoneme, prefix: AffixForm | undefined,
  suffix: AffixForm | undefined, resolve: (sound: string) => Phoneme): MorphophonemicGuardResult {
  const before = root[target.syllableIndex]?.[target.segment]?.[target.index];
  if (!before) throw new Error("Morphophonemic target is outside the lexical root.");
  const proposal = projectMorphologyReplacement(root, target, replacement, prefix, suffix, resolve);
  const coord = proposal.target;
  const syllable = proposal.syllables[coord.syllableIndex];
  const rejections: MorphophonemicRejection[] = [];
  const boundaryRepetitionLicenses: MorphophonemicBoundaryRepetitionLicense[] = [];
  const assembledPhones = [...syllable.onset, ...syllable.nucleus, ...syllable.coda];
  if (rt.phonemeBySound.get(replacement.sound) !== replacement
    || !rt.positionPhonemes[target.segment].some(phone => phone.sound === replacement.sound)) {
    rejections.push(evidence("inventory", coord.syllableIndex, coord.segment, coord.index, [proposal.selected]));
  }
  const affected = new Set<MorphologyPhonePosition>([target.segment]);
  if (target.segment === "nucleus") affected.add("coda");
  for (const segment of affected) {
    const whole = syllable[segment];
    const lexical = whole.filter(phone => phone.source.part === "root");
    const maxLength = segment === "onset" ? (rt.clusterLimits?.maxOnset ?? rt.config.syllableStructure.maxOnsetLength)
      : segment === "coda" ? (rt.clusterLimits?.maxCoda ?? rt.config.syllableStructure.maxCodaLength) : rt.config.syllableStructure.maxNucleusLength;
    if ((segment === "onset" || segment === "nucleus") && whole.length > maxLength) rejections.push(evidence("length", coord.syllableIndex, segment, whole.length - 1, whole));
    const cluster: Phoneme[] = [];
    for (const phone of lexical) {
      const index = whole.indexOf(phone);
      const context: ClusterContext = { rand: NO_RNG, position: segment, cluster,
        clusterSounds: cluster.map(phone => phone.sound), ignoreSet: NO_IGNORES,
        isStartOfWord: coord.syllableIndex === 0 && assembledPhones[0] === phone,
        isEndOfWord: coord.syllableIndex === proposal.syllables.length - 1 && assembledPhones.at(-1) === phone,
        maxLength, syllableCount: proposal.syllables.length,
        ...(segment === "coda" ? { nucleus: syllable.nucleus.map(phone => phone.phoneme) } : {}) };
      const reason = clusterCandidateRejection(phone.phoneme, rt, context);
      if (reason) rejections.push(evidence(reason, coord.syllableIndex, segment, index, lexical));
      cluster.push(phone.phoneme);
    }
    if (whole.some(phone => phone.source.part !== "root")) {
      const groups = clusterLicenseGroups(whole);
      const licensed: Phoneme[] = [];
      for (const group of groups) {
        if (group.members.length > 1) boundaryRepetitionLicenses.push({ syllableIndex: coord.syllableIndex, segment,
          sound: group.phoneme.sound, members: group.members.map(({ index, phone }) => ({ index, source: { ...phone.source } })) });
        const first = whole[group.members[0].index];
        const last = whole[group.members.at(-1)!.index];
        const context: ClusterContext = { rand: NO_RNG, position: segment, cluster: licensed,
          clusterSounds: licensed.map(phone => phone.sound), ignoreSet: NO_IGNORES,
          isStartOfWord: coord.syllableIndex === 0 && assembledPhones[0] === first,
          isEndOfWord: coord.syllableIndex === proposal.syllables.length - 1 && assembledPhones.at(-1) === last,
          maxLength, syllableCount: proposal.syllables.length,
          ...(segment === "coda" ? { nucleus: syllable.nucleus.map(phone => phone.phoneme) } : {}) };
        const reason = clusterCandidateRejection(group.phoneme, rt, context);
        if (reason) rejections.push(evidence(reason, coord.syllableIndex, segment, group.members.at(-1)!.index, whole));
        licensed.push(group.phoneme);
      }
    }
    // Shape features apply across source domains; repetition/attestation remains source-aware.
    if (segment === "coda") {
      const accumulated: Phoneme[] = [];
      for (const [index, phone] of whole.entries()) {
        const reason = codaShapeRejection(accumulated, phone.phoneme, rt.clusterLimits,
          rt.codaAppendantSet, rt.config.codaConstraints);
        if (reason) rejections.push(evidence(reason, coord.syllableIndex, segment, index, whole));
        if (rt.bannedCodaSet?.has(phone.phoneme.sound)) rejections.push(evidence("banned-coda", coord.syllableIndex, segment, index, whole));
        if (syllable.nucleus.some(nucleus => rt.bannedNucleusCodaMap?.get(nucleus.phoneme.sound)?.has(phone.phoneme.sound))) {
          rejections.push(evidence("nucleus-coda", coord.syllableIndex, segment, index, whole));
        }
        accumulated.push(phone.phoneme);
      }
      if (!rt.clusterLimits && whole.length > maxLength) rejections.push(evidence("length", coord.syllableIndex, segment, whole.length - 1, whole));
      if (coord.syllableIndex === proposal.syllables.length - 1 && whole.length
        && rt.allowedFinalSet && !rt.allowedFinalSet.has(whole.at(-1)!.phoneme.sound)) {
        rejections.push(evidence("word-final", coord.syllableIndex, segment, whole.length - 1, whole));
      }
    }
  }
  // Only boundaries touching the modified syllable can acquire a new pair.
  for (const leftIndex of [coord.syllableIndex - 1, coord.syllableIndex]) {
    const left = proposal.syllables[leftIndex], right = proposal.syllables[leftIndex + 1];
    if (!left || !right) continue;
    const coda = left.coda.at(-1), onset = right.onset[0];
    if (coda && onset && rt.bannedSet?.has(`${coda.phoneme.sound}|${onset.phoneme.sound}`)) {
      rejections.push(evidence("boundary", leftIndex, "coda", left.coda.length - 1, [coda, onset]));
    }
  }
  const uniqueRejections = [...new Map(rejections.map(rejection => [JSON.stringify(rejection), rejection])).values()];
  return { accepted: uniqueRejections.length === 0, rootTarget: { ...target }, assembledTarget: { ...coord },
    soundBefore: before.sound, soundProposed: replacement.sound, rejections: uniqueRejections, boundaryRepetitionLicenses };
}
