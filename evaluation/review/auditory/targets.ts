import type { Word } from "../../../src/types.js";
import { digest } from "../snapshot.js";
import type { PronunciationPolicy, PronunciationTarget, TargetAssessment, TargetIssue, TargetSyllable } from "./model.js";

export function validId(value: string): boolean {
  return typeof value === "string" && /^[a-z0-9][a-z0-9-]{0,79}$/.test(value);
}
export function nonempty(value: string): boolean { return typeof value === "string" && value.trim().length > 0; }
export function hash(value: string): boolean { return typeof value === "string" && /^[a-f0-9]{64}$/.test(value); }

export function validatePronunciationPolicy(policy: PronunciationPolicy): void {
  if (policy.version !== "auditory-pronunciation-v1" || !nonempty(policy.dialect) || !nonempty(policy.scope) ||
      !Array.isArray(policy.phones) || !policy.phones.length || !Array.isArray(policy.mappings) || !policy.mappings.length) {
    throw new Error("Invalid auditory pronunciation policy.");
  }
  const ids = new Set<string>(), sources = new Set<string>();
  for (const phone of policy.phones) {
    if (!validId(phone.id) || ids.has(phone.id) || !nonempty(phone.ipa) || !nonempty(phone.description)) throw new Error("Invalid or duplicate target phone.");
    ids.add(phone.id);
  }
  function validPhones(phones: string[]): boolean {
    return Array.isArray(phones) && phones.length > 0 && phones.every(phone => ids.has(phone));
  }
  for (const mapping of policy.mappings) {
    if (!nonempty(mapping.source) || sources.has(mapping.source) || !nonempty(mapping.rationale)) throw new Error("Invalid or duplicate source mapping.");
    sources.add(mapping.source);
    if (mapping.status === "mapped") {
      if (!validPhones(mapping.phones)) throw new Error("Mapped source requires declared target phones; deletion is forbidden.");
    } else if (mapping.status === "ambiguous") {
      if (!Array.isArray(mapping.alternatives) || mapping.alternatives.length < 2 || !mapping.alternatives.every(validPhones) ||
          new Set(mapping.alternatives.map(value => digest(value))).size !== mapping.alternatives.length) throw new Error("Ambiguous source requires distinct declared alternatives.");
    } else throw new Error("Unknown mapping status.");
  }
}

export function makeTarget(policy: PronunciationPolicy, syllables: TargetSyllable[]): PronunciationTarget {
  validatePronunciationPolicy(policy);
  const ids = new Set(policy.phones.map(phone => phone.id));
  if (!Array.isArray(syllables) || !syllables.length || syllables.filter(value => value.stress === "primary").length !== 1 ||
      syllables.some(value => !Array.isArray(value.phones) || !value.phones.length || !value.phones.every(phone => ids.has(phone)) ||
        !["primary", "secondary", "unmarked"].includes(value.stress))) throw new Error("Invalid normalized phones/stress target.");
  const content = { policy_digest: digest(policy), syllables };
  return structuredClone({ ...content, digest: digest(content) });
}

export function assessTarget(word: Word, policy: PronunciationPolicy): TargetAssessment {
  validatePronunciationPolicy(policy);
  const mappings = new Map(policy.mappings.map(mapping => [mapping.source, mapping]));
  const issues: TargetIssue[] = [], syllables: TargetSyllable[] = [];
  const primaryCount = word.syllables.filter(value => value.stress === "ˈ").length;
  if (primaryCount !== 1) issues.push({ kind: primaryCount ? "multiple-primary" : "missing-primary", syllable: null, source: null });
  word.syllables.forEach((syllable, index) => {
    if (!syllable.nucleus.length) issues.push({ kind: "empty-nucleus", syllable: index, source: null });
    if (syllable.stress !== undefined && syllable.stress !== "ˈ" && syllable.stress !== "ˌ") {
      issues.push({ kind: "invalid-stress", syllable: index, source: null });
    }
    const phones: string[] = [];
    for (const phone of [...syllable.onset, ...syllable.nucleus, ...syllable.coda]) {
      const mapping = mappings.get(phone.sound);
      if (!mapping || mapping.status === "ambiguous") {
        issues.push({ kind: mapping ? "ambiguous-phone" : "unknown-phone", syllable: index, source: phone.sound });
      } else phones.push(...mapping.phones);
    }
    let stress: TargetSyllable["stress"] = "unmarked";
    if (syllable.stress === "ˈ") stress = "primary";
    if (syllable.stress === "ˌ") stress = "secondary";
    syllables.push({ phones, stress });
  });
  if (issues.length) return { status: "unresolved", issues };
  return { status: "resolved", target: makeTarget(policy, syllables) };
}
