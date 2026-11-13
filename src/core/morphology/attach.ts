import { matchesPhoneme } from "../../utils/phonemes.js";
import { Phoneme, Syllable, WordGenerationContext } from "../../types.js";
import {
  Affix,
  AllomorphVariant,
  AffixSyllable,
  BoundaryTransform,
  MorphophonemicRule,
  PhonologicalCondition,
  defaultFallbackBridgeOnsets,
  type LanguageConfig,
} from "../../config/language.js";
import getWeightedOption from "../../utils/getWeightedOption.js";
import type { MorphologyPlan, NonBareMorphologyPlan } from "./plan.js";
import { snapshotAffixForm, snapshotWrittenParts } from "./realization.js";
import type {
  AffixForm,
  MorphologyResult,
  MorphologyWrittenPart,
  ResolvedAffix,
} from "./realization.js";
import {
  bindMorphophonemicGuard,
  buildMorphophonemicGuardRuntime,
  isMorphophonemicGuardRuntime,
  type MorphophonemicEvaluation,
  type MorphophonemicGuard,
} from "./morphophonemic-guard.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GeneratorRuntime {
  phonemeBySound?: ReadonlyMap<string, Phoneme>;
  /** Optional bound guard (tests); otherwise built from cluster fields on this runtime. */
  evaluateMorphophonemicReplacement?: MorphophonemicGuard;
  config: {
    morphology?: import("../../config/language.js").MorphologyConfig;
    phonemes: Phoneme[];
    pronunciation?: import("../../config/language.js").PronunciationConfig;
    codaConstraints?: LanguageConfig["codaConstraints"];
    syllableStructure?: LanguageConfig["syllableStructure"];
    invalidClusters?: LanguageConfig["invalidClusters"];
    phonemeMaps?: LanguageConfig["phonemeMaps"];
    clusterLimits?: LanguageConfig["clusterLimits"];
    clusterWeights?: LanguageConfig["clusterWeights"];
    clusterConstraint?: LanguageConfig["clusterConstraint"];
    sonorityConstraints?: LanguageConfig["sonorityConstraints"];
  };
}

function getBoundaryFallbackBridges(rt: GeneratorRuntime): [string, number][] {
  return (
    rt.config.morphology?.boundaryPolicy?.fallbackBridgeOnsets ??
    defaultFallbackBridgeOnsets()
  );
}

function canApplyPrefixRootFallback(rt: GeneratorRuntime): boolean {
  return rt.config.morphology?.boundaryPolicy?.enablePrefixRootFallback ?? true;
}

function canApplyRootSuffixFallback(rt: GeneratorRuntime): boolean {
  return rt.config.morphology?.boundaryPolicy?.enableRootSuffixFallback ?? true;
}

function pickBoundaryBridge(
  rt: GeneratorRuntime,
  context: WordGenerationContext,
): Phoneme | undefined {
  const options: [Phoneme, number][] = getBoundaryFallbackBridges(rt)
    .map(
      ([sound, weight]) =>
        [rt.config.phonemes.find((p) => p.sound === sound), weight] as const,
    )
    .filter(([phoneme, weight]) => !!phoneme && weight > 0)
    .map(([phoneme, weight]) => [phoneme!, weight]);
  if (options.length === 0) return undefined;
  return getWeightedOption(options, context.rand);
}

function realizeBoundaryHiatus(
  rt: GeneratorRuntime,
  context: WordGenerationContext,
  left: Syllable,
  right: Syllable,
  boundary: "prefix-root" | "root-suffix",
  rightSyllableIndex: number,
  fallbackEnabled: boolean,
): void {
  if (left.coda.length > 0 || right.onset.length > 0) return;
  const bridge = fallbackEnabled ? pickBoundaryBridge(rt, context) : undefined;
  if (bridge) {
    right.onset.unshift(bridge);
    context.trace?.recordStructural({
      event:
        boundary === "prefix-root"
          ? "morphPrefixHiatusFallback"
          : "morphSuffixHiatusFallback",
      inserted: bridge.sound,
      syllableIndex: rightSyllableIndex,
    });
  }
  if (left.nucleus.length > 0 && right.nucleus.length > 0) {
    context.trace?.recordStructural({
      event: "morphHiatusDecision",
      boundary,
      leftSyllableIndex: rightSyllableIndex - 1,
      rightSyllableIndex,
      leftNucleus: left.nucleus.map((phone) => phone.sound),
      rightNucleus: right.nucleus.map((phone) => phone.sound),
      fallbackEnabled,
      outcome: bridge
        ? "inserted"
        : fallbackEnabled
          ? "no-bridge-candidate"
          : "preserved",
      inserted: bridge?.sound,
    });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type BoundarySegment = "onset" | "nucleus" | "coda";

interface BoundarySegmentRef {
  syllableIndex: number;
  segment: BoundarySegment;
  index: number;
  phoneme: Phoneme;
}

function getBoundarySegmentRef(
  syllables: Syllable[],
  isPrefix: boolean,
  target: MorphophonemicRule["target"] = "edge",
): BoundarySegmentRef | undefined {
  if (syllables.length === 0) return undefined;

  if (target === "nucleus") {
    const syllableIndex = isPrefix ? 0 : syllables.length - 1;
    const syllable = syllables[syllableIndex];
    if (syllable.nucleus.length === 0) return undefined;
    const index = isPrefix ? 0 : syllable.nucleus.length - 1;
    return {
      syllableIndex,
      segment: "nucleus",
      index,
      phoneme: syllable.nucleus[index],
    };
  }

  if (isPrefix) {
    for (let i = 0; i < syllables.length; i++) {
      const syl = syllables[i];
      if (syl.onset.length > 0) {
        return {
          syllableIndex: i,
          segment: "onset",
          index: 0,
          phoneme: syl.onset[0],
        };
      }
      if (syl.nucleus.length > 0) {
        return {
          syllableIndex: i,
          segment: "nucleus",
          index: 0,
          phoneme: syl.nucleus[0],
        };
      }
      if (syl.coda.length > 0) {
        return {
          syllableIndex: i,
          segment: "coda",
          index: 0,
          phoneme: syl.coda[0],
        };
      }
    }
    return undefined;
  }

  for (let i = syllables.length - 1; i >= 0; i--) {
    const syl = syllables[i];
    if (syl.coda.length > 0) {
      const idx = syl.coda.length - 1;
      return {
        syllableIndex: i,
        segment: "coda",
        index: idx,
        phoneme: syl.coda[idx],
      };
    }
    if (syl.nucleus.length > 0) {
      const idx = syl.nucleus.length - 1;
      return {
        syllableIndex: i,
        segment: "nucleus",
        index: idx,
        phoneme: syl.nucleus[idx],
      };
    }
    if (syl.onset.length > 0) {
      const idx = syl.onset.length - 1;
      return {
        syllableIndex: i,
        segment: "onset",
        index: idx,
        phoneme: syl.onset[idx],
      };
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Config-driven boundary transforms
// ---------------------------------------------------------------------------

export function applyBoundaryTransforms(
  rootWritten: string,
  transforms: BoundaryTransform[],
): string {
  const fired = new Set<string>();
  let result = rootWritten;
  for (const t of transforms) {
    if (t.blockedBy && t.blockedBy.some((name) => fired.has(name))) continue;
    if (t.match.test(result)) {
      result = result.replace(t.match, t.replace);
      fired.add(t.name);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Config-driven phonological condition matching
// ---------------------------------------------------------------------------

export function matchesPhonologicalCondition(
  condition: PhonologicalCondition,
  phoneme: Phoneme,
  isPrefix: boolean,
): boolean {
  if (condition.position === "preceding" && isPrefix) return false;
  if (condition.position === "following" && !isPrefix) return false;
  return matchesPhoneme(phoneme, condition);
}

// ---------------------------------------------------------------------------
// Allomorph resolution
// ---------------------------------------------------------------------------

function allomorphSpecificity(variant: AllomorphVariant): number {
  return variant.phonologicalCondition.manner ||
    variant.phonologicalCondition.place
    ? 0
    : 1;
}

function resolveAllomorph(
  affix: Affix,
  phoneme: Phoneme | undefined,
  isPrefix: boolean,
): ResolvedAffix {
  const selected = phoneme
    ? affix.allomorphs
      ?.map((variant, index) => ({ variant, index }))
      .sort(
        (a, b) =>
          allomorphSpecificity(a.variant) - allomorphSpecificity(b.variant),
      )
      .find(({ variant }) =>
        matchesPhonologicalCondition(
          variant.phonologicalCondition,
          phoneme,
          isPrefix,
        ),
      )
    : undefined;
  const form = selected
    ? {
      ...selected.variant,
      written: selected.variant.written ?? affix.written,
    }
    : affix;
  return {
    planned: snapshotAffixForm(affix),
    resolved: snapshotAffixForm(form),
    allomorphIndex: selected?.index ?? null,
    boundaryPhoneme: phoneme
      ? {
        sound: phoneme.sound,
        voiced: phoneme.voiced,
        mannerOfArticulation: phoneme.mannerOfArticulation,
        placeOfArticulation: phoneme.placeOfArticulation,
      }
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// AffixSyllable -> Syllable conversion
// ---------------------------------------------------------------------------

function affixSyllablesToSyllables(
  templates: AffixSyllable[],
  resolve: (sound: string) => Phoneme,
): Syllable[] {
  return templates.map((t) => ({
    onset: t.onset.map(resolve),
    nucleus: t.nucleus.map(resolve),
    coda: t.coda.map(resolve),
    stress: undefined,
  }));
}

// ---------------------------------------------------------------------------
// Stress adjustment
// ---------------------------------------------------------------------------

function adjustStress(
  syllables: Syllable[],
  stressEffect: Affix["stressEffect"],
  affixSyllableIndices: number[],
  isPrefix: boolean,
): void {
  if (stressEffect === "none" || affixSyllableIndices.length === 0) return;

  if (stressEffect === "primary") {
    for (const syl of syllables) {
      if (syl.stress === "\u02C8") syl.stress = "\u02CC";
    }
    syllables[affixSyllableIndices[0]].stress = "\u02C8";
  } else if (stressEffect === "secondary") {
    syllables[affixSyllableIndices[0]].stress = "\u02CC";
  } else if (stressEffect === "attract-preceding" && !isPrefix) {
    const firstAffixIdx = affixSyllableIndices[0];
    if (firstAffixIdx > 0) {
      for (const syl of syllables) {
        if (syl.stress === "\u02C8") syl.stress = "\u02CC";
      }
      syllables[firstAffixIdx - 1].stress = "\u02C8";
    }
  }
}

interface FiredMorphophonemicRule {
  rule: string;
  affix: string;
  boundary: "prefix-root" | "root-suffix";
  soundBefore?: string;
  soundAfter?: string;
  writtenBefore?: string;
  writtenAfter?: string;
}

interface PreparedMorphophonemicRule {
  rule: MorphophonemicRule;
  event: FiredMorphophonemicRule;
}

/** Resolved attachment retained between lexical assembly and spelling. */
export interface PreparedMorphology {
  plan: MorphologyPlan;
  prefix?: ResolvedAffix;
  suffix?: ResolvedAffix;
  prefixWritten: string;
  suffixWritten: string;
  rootSyllableStart: number;
  rules: PreparedMorphophonemicRule[];
  /** Present when morphophonemic cluster-legality policy is enabled. */
  evaluations?: MorphophonemicEvaluation[];
}

interface MorphophonemicPolicyContext {
  evaluate: MorphophonemicGuard;
  prefix?: AffixForm;
  suffix?: AffixForm;
  affixIndex: number;
  evaluations: MorphophonemicEvaluation[];
}

function prepareMorphophonemicRules(
  rootSyllables: Syllable[],
  affix: Affix,
  isPrefix: boolean,
  resolvePhoneme: (sound: string) => Phoneme,
  policy?: MorphophonemicPolicyContext,
): PreparedMorphophonemicRule[] {
  if (!affix.morphophonemicRules || affix.morphophonemicRules.length === 0) {
    return [];
  }

  const sortedRules = [...affix.morphophonemicRules].sort(
    (a, b) => (a.priority ?? 100) - (b.priority ?? 100),
  );
  const prepared: PreparedMorphophonemicRule[] = [];

  for (const rule of sortedRules) {
    const boundaryRef = getBoundarySegmentRef(
      rootSyllables,
      isPrefix,
      rule.target ?? "edge",
    );
    const evaluation: MorphophonemicEvaluation | undefined = policy
      ? {
        ruleIndex: affix.morphophonemicRules.indexOf(rule),
        affixIndex: policy.affixIndex,
        boundary: isPrefix ? "prefix-root" : "root-suffix",
        rule: rule.name,
        outcome: "target-unavailable",
        ...(boundaryRef
          ? {
            target: {
              syllableIndex: boundaryRef.syllableIndex,
              segment: boundaryRef.segment,
              index: boundaryRef.index,
            },
            soundBefore: boundaryRef.phoneme.sound,
            soundProposed:
                rule.replaceSound ?? boundaryRef.phoneme.sound,
          }
          : {}),
      }
      : undefined;
    if (evaluation) policy!.evaluations.push(evaluation);
    if (!boundaryRef) continue;
    if (
      rule.phonologicalCondition &&
      !matchesPhonologicalCondition(
        rule.phonologicalCondition,
        boundaryRef.phoneme,
        isPrefix,
      )
    ) {
      if (evaluation) evaluation.outcome = "condition-not-matched";
      continue;
    }

    if (evaluation) {
      evaluation.outcome = rule.replaceSound ? "identity" : "written-only";
    }

    const event: FiredMorphophonemicRule = {
      rule: rule.name,
      affix: affix.written,
      boundary: isPrefix ? "prefix-root" : "root-suffix",
    };

    if (rule.replaceSound && rule.replaceSound !== boundaryRef.phoneme.sound) {
      const next = resolvePhoneme(rule.replaceSound);
      if (policy && evaluation) {
        evaluation.guard = policy.evaluate(
          rootSyllables,
          evaluation.target!,
          next,
          policy.prefix,
          policy.suffix,
          resolvePhoneme,
        );
        evaluation.outcome = evaluation.guard.accepted
          ? "accepted"
          : "rejected";
        if (!evaluation.guard.accepted) continue;
      }
      rootSyllables[boundaryRef.syllableIndex][boundaryRef.segment][
        boundaryRef.index
      ] = next;
      event.soundBefore = boundaryRef.phoneme.sound;
      event.soundAfter = next.sound;
    }

    prepared.push({ rule, event });
  }

  return prepared;
}

function isFullLanguageConfig(
  config: GeneratorRuntime["config"],
): config is LanguageConfig {
  return (
    !!config.syllableStructure &&
    !!config.invalidClusters &&
    "phonemeMaps" in config &&
    !!(config as LanguageConfig).phonemeMaps
  );
}

function resolveMorphophonemicGuard(
  rt: GeneratorRuntime,
): MorphophonemicGuard | undefined {
  const preserve =
    rt.config.morphology?.morphophonemicPolicy?.preserveClusterLegality;
  if (!preserve) return undefined;
  if (rt.evaluateMorphophonemicReplacement) {
    return rt.evaluateMorphophonemicReplacement;
  }
  if (isMorphophonemicGuardRuntime(rt)) {
    return bindMorphophonemicGuard(rt);
  }
  if (isFullLanguageConfig(rt.config)) {
    return bindMorphophonemicGuard(buildMorphophonemicGuardRuntime(rt.config));
  }
  throw new Error(
    "Configured morphophonemic legality requires the production guard runtime.",
  );
}

// ---------------------------------------------------------------------------
// Main API
// ---------------------------------------------------------------------------

export function prepareMorphology(
  rt: GeneratorRuntime,
  context: WordGenerationContext,
  plan: NonBareMorphologyPlan,
): PreparedMorphology;
export function prepareMorphology(
  rt: GeneratorRuntime,
  context: WordGenerationContext,
  plan: MorphologyPlan,
): PreparedMorphology | undefined;
export function prepareMorphology(
  rt: GeneratorRuntime,
  context: WordGenerationContext,
  plan: MorphologyPlan,
): PreparedMorphology | undefined {
  if (plan.template === "bare") return undefined;

  const syllables = context.word.syllables;

  let prefix: ResolvedAffix | undefined;
  let suffix: ResolvedAffix | undefined;

  if (plan.prefix) {
    const firstPhoneme = getBoundarySegmentRef(syllables, true)?.phoneme;
    prefix = resolveAllomorph(plan.prefix, firstPhoneme, true);
  }

  if (plan.suffix) {
    const lastPhoneme = getBoundarySegmentRef(syllables, false)?.phoneme;
    suffix = resolveAllomorph(plan.suffix, lastPhoneme, false);
  }
  const prefixVariant = prefix?.resolved;
  const suffixVariant = suffix?.resolved;

  const phonemeMap =
    rt.phonemeBySound ??
    new Map(rt.config.phonemes.map((phoneme) => [phoneme.sound, phoneme]));

  function resolvePhoneme(sound: string): Phoneme {
    return (
      phonemeMap.get(sound) ?? {
        sound,
        voiced: true,
        mannerOfArticulation: "midVowel" as const,
        placeOfArticulation: "central" as const,
        startWord: 1,
        midWord: 1,
        endWord: 1,
      }
    );
  }

  const rules: PreparedMorphophonemicRule[] = [];
  const guard = resolveMorphophonemicGuard(rt);
  const evaluations: MorphophonemicEvaluation[] | undefined = guard
    ? []
    : undefined;
  const policyFor = (affixIndex: number): MorphophonemicPolicyContext | undefined =>
    guard && evaluations
      ? {
        evaluate: guard,
        prefix: prefixVariant,
        suffix: suffixVariant,
        affixIndex,
        evaluations,
      }
      : undefined;
  if (plan.prefix && prefixVariant) {
    rules.push(
      ...prepareMorphophonemicRules(
        syllables,
        plan.prefix,
        true,
        resolvePhoneme,
        policyFor(
          rt.config.morphology?.prefixes.indexOf(plan.prefix) ?? -1,
        ),
      ),
    );
  }
  if (plan.suffix && suffixVariant) {
    rules.push(
      ...prepareMorphophonemicRules(
        syllables,
        plan.suffix,
        false,
        resolvePhoneme,
        policyFor(
          rt.config.morphology?.suffixes.indexOf(plan.suffix) ?? -1,
        ),
      ),
    );
  }

  const prefixWritten = prefixVariant?.written ?? "";
  const suffixWritten = suffixVariant?.written ?? "";

  const prefixSyllables = prefixVariant
    ? prefixVariant.syllables !== undefined &&
      prefixVariant.syllables.length > 0
      ? affixSyllablesToSyllables(prefixVariant.syllables, resolvePhoneme)
      : []
    : [];
  const suffixSyllables = suffixVariant
    ? suffixVariant.syllables !== undefined &&
      suffixVariant.syllables.length > 0
      ? affixSyllablesToSyllables(suffixVariant.syllables, resolvePhoneme)
      : []
    : [];

  if (
    suffixVariant &&
    suffixVariant.syllableCount === 0 &&
    suffixSyllables.length === 0 &&
    suffixVariant.phonemes.length > 0
  ) {
    const lastSyl = syllables[syllables.length - 1];
    for (const s of suffixVariant.phonemes) {
      lastSyl.coda.push(resolvePhoneme(s));
    }
  } else if (
    suffixVariant &&
    suffixVariant.syllableCount === 0 &&
    suffixSyllables.length > 0
  ) {
    const lastSyl = syllables[syllables.length - 1];
    for (const ss of suffixSyllables) {
      lastSyl.coda.push(...ss.onset, ...ss.nucleus, ...ss.coda);
    }
    suffixSyllables.length = 0;
  }

  if (
    prefixVariant &&
    prefixVariant.syllableCount === 0 &&
    prefixSyllables.length === 0 &&
    prefixVariant.phonemes.length > 0
  ) {
    const firstSyl = syllables[0];
    for (const s of prefixVariant.phonemes) {
      firstSyl.onset.unshift(resolvePhoneme(s));
    }
  } else if (
    prefixVariant &&
    prefixVariant.syllableCount === 0 &&
    prefixSyllables.length > 0
  ) {
    const firstSyl = syllables[0];
    for (const ps of prefixSyllables) {
      firstSyl.onset.unshift(...ps.onset, ...ps.nucleus, ...ps.coda);
    }
    prefixSyllables.length = 0;
  }

  if (prefixSyllables.length > 0 && syllables.length > 0) {
    realizeBoundaryHiatus(
      rt,
      context,
      prefixSyllables[prefixSyllables.length - 1],
      syllables[0],
      "prefix-root",
      prefixSyllables.length,
      canApplyPrefixRootFallback(rt),
    );
  }

  if (suffixSyllables.length > 0 && syllables.length > 0) {
    realizeBoundaryHiatus(
      rt,
      context,
      syllables[syllables.length - 1],
      suffixSyllables[0],
      "root-suffix",
      prefixSyllables.length + syllables.length,
      canApplyRootSuffixFallback(rt),
    );
  }

  const prefixIndices: number[] = [];
  const suffixIndices: number[] = [];

  for (let i = 0; i < prefixSyllables.length; i++) {
    prefixIndices.push(i);
  }
  context.word.syllables = [
    ...prefixSyllables,
    ...syllables,
    ...suffixSyllables,
  ];
  for (let i = 0; i < suffixSyllables.length; i++) {
    suffixIndices.push(prefixSyllables.length + syllables.length + i);
  }

  if (plan.prefix && prefixIndices.length > 0) {
    adjustStress(
      context.word.syllables,
      plan.prefix.stressEffect,
      prefixIndices,
      true,
    );
  }
  if (plan.suffix && suffixIndices.length > 0) {
    adjustStress(
      context.word.syllables,
      plan.suffix.stressEffect,
      suffixIndices,
      false,
    );
  }

  return {
    plan,
    prefix,
    suffix,
    prefixWritten,
    suffixWritten,
    rootSyllableStart: prefixSyllables.length,
    rules,
    ...(evaluations ? { evaluations } : {}),
  };
}

/** Apply the written halves of the already-resolved morphological rules once. */
export function writeMorphology(
  context: WordGenerationContext,
  prepared: PreparedMorphology,
): MorphologyResult {
  const { plan, prefix, suffix, prefixWritten, suffixWritten } = prepared;
  let rootWritten = context.word.written.clean;
  const fired: FiredMorphophonemicRule[] = [];
  for (const { rule, event } of prepared.rules) {
    const writtenEvent = { ...event };
    if (rule.writtenMatch && rule.writtenReplace !== undefined) {
      const rewritten = rootWritten.replace(
        rule.writtenMatch,
        rule.writtenReplace,
      );
      if (rewritten !== rootWritten) {
        writtenEvent.writtenBefore = rootWritten;
        writtenEvent.writtenAfter = rewritten;
        rootWritten = rewritten;
      }
    }
    if (
      writtenEvent.soundBefore !== undefined ||
      writtenEvent.writtenBefore !== undefined
    )
      fired.push(writtenEvent);
  }
  for (const affix of [plan.prefix, plan.suffix]) {
    if (affix?.boundaryTransforms)
      rootWritten = applyBoundaryTransforms(
        rootWritten,
        affix.boundaryTransforms,
      );
  }
  if (context.trace?.morphologyTrace && fired.length > 0)
    context.trace.morphologyTrace.alternations = fired;
  context.word.written.clean = prefixWritten + rootWritten + suffixWritten;

  const parts: MorphologyWrittenPart[] = [];
  if (prefix) parts.push({ role: "prefix", text: prefixWritten });
  parts.push({ role: "root", text: rootWritten });
  if (suffix) parts.push({ role: "suffix", text: suffixWritten });
  context.word.written.hyphenated = parts
    .filter((part) => part.role === "root" || part.text)
    .map((part) => part.text)
    .join("-");
  if (context.trace?.morphologyTrace) {
    context.trace.morphologyTrace.realization = {
      prefix,
      suffix,
      assembledParts: snapshotWrittenParts(parts),
      emittedParts: snapshotWrittenParts(parts),
    };
  }
  return { prefix, suffix, parts };
}

/** Attach morphology to an already-spelled lexical root; surface realization is separate. */
export function applyMorphology(
  rt: GeneratorRuntime,
  context: WordGenerationContext,
  plan: MorphologyPlan,
): MorphologyResult {
  const prepared = prepareMorphology(rt, context, plan);
  if (!prepared)
    return { parts: [{ role: "root", text: context.word.written.clean }] };
  return writeMorphology(context, prepared);
}
