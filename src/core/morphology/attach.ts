import type { MorphophonemicGuard } from "../morphophonemic-guard.js";
import { FinalPhones, type FinalPhoneTrace, type PhoneIdentitySyllable } from "../final-phones.js";
import { FinalSpelling } from "../final-spelling.js";
import { replaceWithSpellingEdits } from "../spelling-regex-edits.js";
import { Phoneme, Syllable, WordGenerationContext } from "../../types.js";
import { Affix, AllomorphVariant, AffixSyllable, BoundaryTransform, MorphophonemicRule, PhonologicalCondition, defaultFallbackBridgeOnsets } from "../../config/language.js";
import getWeightedOption from "../../utils/getWeightedOption.js";
import type { MorphologyPlan } from "./plan.js";
import { snapshotAffixForm, snapshotWrittenParts } from "./realization.js";
import type { MorphologyResult, MorphologyWrittenPart, ResolvedAffix, MorphologyRootEdit, MorphologyRegexState, MorphophonemicEvaluation, AffixForm } from "./realization.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GeneratorRuntime {
  evaluateMorphophonemicReplacement?: MorphophonemicGuard;
  config: {
    morphology?: import("../../config/language.js").MorphologyConfig;
    phonemes: Phoneme[];
    pronunciation?: import("../../config/language.js").PronunciationConfig;
  };
}

function getBoundaryFallbackBridges(rt: GeneratorRuntime): [string, number][] {
  return rt.config.morphology?.boundaryPolicy?.fallbackBridgeOnsets ?? defaultFallbackBridgeOnsets();
}

function canApplyPrefixRootFallback(rt: GeneratorRuntime): boolean {
  return rt.config.morphology?.boundaryPolicy?.enablePrefixRootFallback ?? true;
}

function canApplyRootSuffixFallback(rt: GeneratorRuntime): boolean {
  return rt.config.morphology?.boundaryPolicy?.enableRootSuffixFallback ?? true;
}

function pickBoundaryBridge(rt: GeneratorRuntime, context: WordGenerationContext): Phoneme | undefined {
  const options: [Phoneme, number][] = getBoundaryFallbackBridges(rt)
    .map(([sound, weight]) => [rt.config.phonemes.find(p => p.sound === sound), weight] as const)
    .filter(([phoneme, weight]) => !!phoneme && weight > 0)
    .map(([phoneme, weight]) => [phoneme!, weight]);
  if (options.length === 0) return undefined;
  return getWeightedOption(options, context.rand);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getLastPhoneme(context: WordGenerationContext): Phoneme | undefined {
  const syllables = context.word.syllables;
  for (let i = syllables.length - 1; i >= 0; i--) {
    const syl = syllables[i];
    if (syl.coda.length > 0) return syl.coda[syl.coda.length - 1];
    if (syl.nucleus.length > 0) return syl.nucleus[syl.nucleus.length - 1];
    if (syl.onset.length > 0) return syl.onset[syl.onset.length - 1];
  }
  return undefined;
}

function getFirstPhoneme(context: WordGenerationContext): Phoneme | undefined {
  const syllables = context.word.syllables;
  for (let i = 0; i < syllables.length; i++) {
    const syl = syllables[i];
    if (syl.onset.length > 0) return syl.onset[0];
    if (syl.nucleus.length > 0) return syl.nucleus[0];
    if (syl.coda.length > 0) return syl.coda[0];
  }
  return undefined;
}

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
        return { syllableIndex: i, segment: "onset", index: 0, phoneme: syl.onset[0] };
      }
      if (syl.nucleus.length > 0) {
        return { syllableIndex: i, segment: "nucleus", index: 0, phoneme: syl.nucleus[0] };
      }
      if (syl.coda.length > 0) {
        return { syllableIndex: i, segment: "coda", index: 0, phoneme: syl.coda[0] };
      }
    }
    return undefined;
  }

  for (let i = syllables.length - 1; i >= 0; i--) {
    const syl = syllables[i];
    if (syl.coda.length > 0) {
      const idx = syl.coda.length - 1;
      return { syllableIndex: i, segment: "coda", index: idx, phoneme: syl.coda[idx] };
    }
    if (syl.nucleus.length > 0) {
      const idx = syl.nucleus.length - 1;
      return { syllableIndex: i, segment: "nucleus", index: idx, phoneme: syl.nucleus[idx] };
    }
    if (syl.onset.length > 0) {
      const idx = syl.onset.length - 1;
      return { syllableIndex: i, segment: "onset", index: idx, phoneme: syl.onset[idx] };
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Config-driven boundary transforms
// ---------------------------------------------------------------------------

export function applyBoundaryTransforms(
  rootWritten: string, transforms: BoundaryTransform[],
  record?: (event: Omit<MorphologyRootEdit, "phase" | "boundary">) => void,
): string {
  const fired = new Set<string>();
  let result = rootWritten;
  for (const [ruleIndex, t] of transforms.entries()) {
    if (t.blockedBy && t.blockedBy.some(name => fired.has(name))) continue;
    if (t.match.test(result)) {
      if (record) {
        const applied = replaceWithSpellingEdits(result, t.match, t.replace);
        record({ rule: t.name, ruleIndex, before: result, after: applied.surface, edits: applied.edits });
        result = applied.surface;
      } else {
        result = result.replace(t.match, t.replace);
      }
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
  if (condition.sounds && !condition.sounds.includes(phoneme.sound)) return false;
  if (condition.voiced !== undefined && phoneme.voiced !== condition.voiced) return false;
  if (condition.manner && !condition.manner.includes(phoneme.mannerOfArticulation)) return false;
  if (condition.place && !condition.place.includes(phoneme.placeOfArticulation)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Allomorph resolution
// ---------------------------------------------------------------------------

function allomorphSpecificity(variant: AllomorphVariant): number {
  return (variant.phonologicalCondition.manner || variant.phonologicalCondition.place) ? 0 : 1;
}

function resolveAllomorph(
  affix: Affix,
  phoneme: Phoneme | undefined,
  isPrefix: boolean,
): ResolvedAffix {
  // Sort by specificity: conditions with manner/place constraints before voiced-only
  const selected = phoneme ? affix.allomorphs
    ?.map((variant, index) => ({ variant, index }))
    .sort((a, b) => allomorphSpecificity(a.variant) - allomorphSpecificity(b.variant))
    .find(({ variant }) => matchesPhonologicalCondition(variant.phonologicalCondition, phoneme, isPrefix)) : undefined;
  const form = selected ? { ...selected.variant, written: selected.variant.written ?? affix.written } : affix;
  return {
    planned: snapshotAffixForm(affix),
    resolved: snapshotAffixForm(form),
    allomorphIndex: selected?.index ?? null,
    boundaryPhoneme: phoneme ? {
      sound: phoneme.sound,
      voiced: phoneme.voiced,
      mannerOfArticulation: phoneme.mannerOfArticulation,
      placeOfArticulation: phoneme.placeOfArticulation,
    } : undefined,
  };
}

// ---------------------------------------------------------------------------
// AffixSyllable -> Syllable conversion
// ---------------------------------------------------------------------------

/** Cached phoneme-by-sound map, keyed by inventory identity (reference). */
let _cachedInventory: Phoneme[] | undefined;
let _cachedPhonemeMap: Map<string, Phoneme> | undefined;

function getPhonemeMap(inventory: Phoneme[]): Map<string, Phoneme> {
  if (_cachedInventory === inventory && _cachedPhonemeMap) return _cachedPhonemeMap;
  const map = new Map<string, Phoneme>();
  for (const p of inventory) map.set(p.sound, p);
  _cachedInventory = inventory;
  _cachedPhonemeMap = map;
  return map;
}

function affixSyllablesToSyllables(templates: AffixSyllable[], inventory: Phoneme[]): Syllable[] {
  const phonemeMap = getPhonemeMap(inventory);

  function resolve(sound: string): Phoneme {
    const p = phonemeMap.get(sound);
    if (!p) {
      return {
        sound, voiced: true,
        mannerOfArticulation: "midVowel" as const,
        placeOfArticulation: "central" as const,
        startWord: 1, midWord: 1, endWord: 1,
      };
    }
    return p;
  }

  return templates.map(t => ({
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
  ruleIndex: number;
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
  evaluations?: MorphophonemicEvaluation[];
  selectionPhones?: FinalPhoneTrace;
  phoneAssembly?: FinalPhoneTrace;
  configurationIndices: { prefix?: number; suffix?: number };
}

function prepareMorphophonemicRules(
  rootSyllables: Syllable[],
  affix: Affix,
  isPrefix: boolean,
  resolvePhoneme: (sound: string) => Phoneme,
  phoneState?: { ledger: FinalPhones; root: PhoneIdentitySyllable[] },
  policy?: { evaluate: MorphophonemicGuard; prefix?: AffixForm; suffix?: AffixForm;
    affixIndex: number; evaluations: MorphophonemicEvaluation[] },
): PreparedMorphophonemicRule[] {
  if (!affix.morphophonemicRules || affix.morphophonemicRules.length === 0) {
    return [];
  }

  const sortedRules = [...affix.morphophonemicRules].sort(
    (a, b) => (a.priority ?? 100) - (b.priority ?? 100),
  );
  const prepared: PreparedMorphophonemicRule[] = [];

  for (const rule of sortedRules) {
    const boundaryRef = getBoundarySegmentRef(rootSyllables, isPrefix, rule.target ?? "edge");
    const evaluation: MorphophonemicEvaluation | undefined = policy ? {
      ruleIndex: affix.morphophonemicRules.indexOf(rule), affixIndex: policy?.affixIndex ?? -1,
      boundary: isPrefix ? "prefix-root" : "root-suffix", rule: rule.name,
      outcome: "target-unavailable",
      ...(boundaryRef ? { target: { syllableIndex: boundaryRef.syllableIndex, segment: boundaryRef.segment, index: boundaryRef.index },
        soundBefore: boundaryRef.phoneme.sound, soundProposed: rule.replaceSound ?? boundaryRef.phoneme.sound } : {}),
    } : undefined;
    if (evaluation) policy!.evaluations.push(evaluation);
    if (!boundaryRef) continue;
    if (
      rule.phonologicalCondition
      && !matchesPhonologicalCondition(rule.phonologicalCondition, boundaryRef.phoneme, isPrefix)
    ) {
      if (evaluation) evaluation.outcome = "condition-not-matched";
      continue;
    }

    if (evaluation) evaluation.outcome = rule.replaceSound ? "identity" : "written-only";
    const event: FiredMorphophonemicRule = {
      rule: rule.name,
      affix: affix.written,
      boundary: isPrefix ? "prefix-root" : "root-suffix",
    };

    if (rule.replaceSound && rule.replaceSound !== boundaryRef.phoneme.sound) {
      const next = resolvePhoneme(rule.replaceSound);
      if (policy && evaluation) {
        evaluation.guard = policy.evaluate(rootSyllables, evaluation.target!, next, policy.prefix, policy.suffix, resolvePhoneme);
        evaluation.outcome = evaluation.guard.accepted ? "accepted" : "rejected";
        if (!evaluation.guard.accepted) continue;
      }
      if (phoneState) phoneState.ledger.replace(phoneState.root[boundaryRef.syllableIndex][boundaryRef.segment][boundaryRef.index],
        boundaryRef.phoneme.sound, next.sound, `morphophonemic:${isPrefix ? "prefix-root" : "root-suffix"}:${affix.morphophonemicRules.indexOf(rule)}:${rule.name}`);
      rootSyllables[boundaryRef.syllableIndex][boundaryRef.segment][boundaryRef.index] = next;
      event.soundBefore = boundaryRef.phoneme.sound;
      event.soundAfter = next.sound;
    }

    prepared.push({ rule, event, ruleIndex: affix.morphophonemicRules.indexOf(rule) });
  }

  return prepared;
}

// ---------------------------------------------------------------------------
// Main API
// ---------------------------------------------------------------------------

function prepareMorphologyOperations(
  rt: GeneratorRuntime,
  context: WordGenerationContext,
  plan: MorphologyPlan,
): PreparedMorphology | undefined {
  if (plan.template === "bare") return undefined;

  const config = rt.config;
  const syllables = context.word.syllables;
  const phoneLedger = context.finalPhoneState?.ledger ?? (context.trace ? new FinalPhones() : undefined);
  const rootIds = context.finalPhoneState?.ids ?? phoneLedger?.register("root", syllables);
  const phoneState = phoneLedger && rootIds ? { ledger: phoneLedger, root: rootIds } : undefined;
  const selectionPhones = phoneLedger?.snapshot(rootIds!, syllables);

  let prefix: ResolvedAffix | undefined;
  let suffix: ResolvedAffix | undefined;

  if (plan.prefix) {
    const firstPhoneme = getFirstPhoneme(context);
    prefix = resolveAllomorph(plan.prefix, firstPhoneme, true);
  }

  if (plan.suffix) {
    const lastPhoneme = getLastPhoneme(context);
    suffix = resolveAllomorph(plan.suffix, lastPhoneme, false);
  }
  const prefixVariant = prefix?.resolved;
  const suffixVariant = suffix?.resolved;

  const inventory = config.phonemes;
  const phonemeMap = getPhonemeMap(inventory);

  function resolvePhoneme(sound: string): Phoneme {
    return phonemeMap.get(sound) ?? {
      sound, voiced: true,
      mannerOfArticulation: "midVowel" as const,
      placeOfArticulation: "central" as const,
      startWord: 1, midWord: 1, endWord: 1,
    };
  }

  const rules: PreparedMorphophonemicRule[] = [];
  const preserveLegality = config.morphology?.morphophonemicPolicy?.preserveClusterLegality;
  if (preserveLegality && !rt.evaluateMorphophonemicReplacement) {
    throw new Error("Configured morphophonemic legality requires the production guard runtime.");
  }
  const evaluations: MorphophonemicEvaluation[] | undefined = preserveLegality ? [] : undefined;
  const policyFor = (affixIndex: number) => evaluations ? {
    evaluate: rt.evaluateMorphophonemicReplacement!, prefix: prefixVariant, suffix: suffixVariant, affixIndex, evaluations,
  } : undefined;
  if (plan.prefix && prefixVariant) {
    rules.push(...prepareMorphophonemicRules(
      syllables,
      plan.prefix,
      true,
      resolvePhoneme,
      phoneState,
      policyFor(config.morphology?.prefixes.indexOf(plan.prefix) ?? -1),
    ));
  }
  if (plan.suffix && suffixVariant) {
    rules.push(...prepareMorphophonemicRules(
      syllables,
      plan.suffix,
      false,
      resolvePhoneme,
      phoneState,
      policyFor(config.morphology?.suffixes.indexOf(plan.suffix) ?? -1),
    ));
  }

  const prefixWritten = prefixVariant?.written ?? "";
  const suffixWritten = suffixVariant?.written ?? "";

  const prefixSyllables = prefixVariant
    ? (prefixVariant.syllables !== undefined && prefixVariant.syllables.length > 0
      ? affixSyllablesToSyllables(prefixVariant.syllables, inventory)
      : [])
    : [];
  const suffixSyllables = suffixVariant
    ? (suffixVariant.syllables !== undefined && suffixVariant.syllables.length > 0
      ? affixSyllablesToSyllables(suffixVariant.syllables, inventory)
      : [])
    : [];

  const prefixIds = phoneLedger?.register("prefix", prefixSyllables);
  const suffixIds = phoneLedger?.register("suffix", suffixSyllables);

  // Handle zero-syllable affixes: append phonemes directly to root coda/onset
  if (suffixVariant && suffixVariant.syllableCount === 0 && suffixSyllables.length === 0 && suffixVariant.phonemes.length > 0) {
    const lastSyl = syllables[syllables.length - 1];
    for (const [index, s] of suffixVariant.phonemes.entries()) {
      lastSyl.coda.push(resolvePhoneme(s));
      if (phoneLedger) rootIds![rootIds!.length - 1].coda.push(phoneLedger.add(s, { kind: "flat-affix", part: "suffix", index }));
    }
  } else if (suffixVariant && suffixVariant.syllableCount === 0 && suffixSyllables.length > 0) {
    const lastSyl = syllables[syllables.length - 1];
    for (const ss of suffixSyllables) {
      lastSyl.coda.push(...ss.onset, ...ss.nucleus, ...ss.coda);
    }
    if (suffixIds) {
      for (const ids of suffixIds) rootIds![rootIds!.length - 1].coda.push(...ids.onset, ...ids.nucleus, ...ids.coda);
      suffixIds.length = 0;
    }
    suffixSyllables.length = 0;
  }

  if (prefixVariant && prefixVariant.syllableCount === 0 && prefixSyllables.length === 0 && prefixVariant.phonemes.length > 0) {
    const firstSyl = syllables[0];
    for (const [index, s] of prefixVariant.phonemes.entries()) {
      firstSyl.onset.unshift(resolvePhoneme(s));
      if (phoneLedger) rootIds![0].onset.unshift(phoneLedger.add(s, { kind: "flat-affix", part: "prefix", index }));
    }
  } else if (prefixVariant && prefixVariant.syllableCount === 0 && prefixSyllables.length > 0) {
    const firstSyl = syllables[0];
    for (const ps of prefixSyllables) {
      firstSyl.onset.unshift(...ps.onset, ...ps.nucleus, ...ps.coda);
    }
    if (prefixIds) {
      for (const ids of prefixIds) rootIds![0].onset.unshift(...ids.onset, ...ids.nucleus, ...ids.coda);
      prefixIds.length = 0;
    }
    prefixSyllables.length = 0;
  }

  // Prefix/root vowel-hiatus fallback at phoneme boundary.
  if (canApplyPrefixRootFallback(rt) && prefixSyllables.length > 0 && syllables.length > 0) {
    const lastPrefix = prefixSyllables[prefixSyllables.length - 1];
    const firstRoot = syllables[0];
    if (lastPrefix.coda.length === 0 && firstRoot.onset.length === 0) {
      const bridge = pickBoundaryBridge(rt, context);
      if (bridge) {
        firstRoot.onset.unshift(bridge);
        if (phoneLedger) rootIds![0].onset.unshift(phoneLedger.add(bridge.sound, { kind: "bridge", boundary: "prefix-root" }));
        context.trace?.recordStructural({
          event: "morphPrefixHiatusFallback",
          inserted: bridge.sound,
          syllableIndex: prefixSyllables.length,
        });
      }
    }
  }

  // Root/suffix vowel-hiatus fallback at phoneme boundary.
  if (canApplyRootSuffixFallback(rt) && suffixSyllables.length > 0 && syllables.length > 0) {
    const lastRoot = syllables[syllables.length - 1];
    const firstSuffix = suffixSyllables[0];
    if (lastRoot.coda.length === 0 && firstSuffix.onset.length === 0) {
      const bridge = pickBoundaryBridge(rt, context);
      if (bridge) {
        firstSuffix.onset.unshift(bridge);
        if (phoneLedger) suffixIds![0].onset.unshift(phoneLedger.add(bridge.sound, { kind: "bridge", boundary: "root-suffix" }));
        context.trace?.recordStructural({
          event: "morphSuffixHiatusFallback",
          inserted: bridge.sound,
          syllableIndex: prefixSyllables.length + syllables.length,
        });
      }
    }
  }

  const prefixIndices: number[] = [];
  const suffixIndices: number[] = [];

  for (let i = 0; i < prefixSyllables.length; i++) {
    prefixIndices.push(i);
  }
  context.word.syllables = [...prefixSyllables, ...syllables, ...suffixSyllables];
  for (let i = 0; i < suffixSyllables.length; i++) {
    suffixIndices.push(prefixSyllables.length + syllables.length + i);
  }

  if (plan.prefix && prefixIndices.length > 0) {
    adjustStress(context.word.syllables, plan.prefix.stressEffect, prefixIndices, true);
  }
  if (plan.suffix && suffixIndices.length > 0) {
    adjustStress(context.word.syllables, plan.suffix.stressEffect, suffixIndices, false);
  }

  const assemblyIds = phoneLedger ? [...prefixIds!, ...rootIds!, ...suffixIds!] : undefined;
  const phoneAssembly = phoneLedger?.snapshot(assemblyIds!, context.word.syllables);
  if (phoneLedger && assemblyIds) context.finalPhoneState = { ledger: phoneLedger, ids: assemblyIds };
  return { plan, prefix, suffix, prefixWritten, suffixWritten, rootSyllableStart: prefixSyllables.length, rules,
    ...(evaluations ? { evaluations } : {}), selectionPhones, phoneAssembly, configurationIndices: {
      ...(plan.prefix ? { prefix: config.morphology?.prefixes.indexOf(plan.prefix) ?? -1 } : {}),
      ...(plan.suffix ? { suffix: config.morphology?.suffixes.indexOf(plan.suffix) ?? -1 } : {}),
    } };
}

/** Apply the written halves of the already-resolved morphological rules once. */
function writeMorphologyOperations(context: WordGenerationContext, prepared: PreparedMorphology): MorphologyResult {
  const { plan, prefix, suffix, prefixWritten, suffixWritten, selectionPhones, phoneAssembly, configurationIndices } = prepared;
  let rootWritten = context.word.written.clean;
  const finalSpelling = context.trace ? context.finalSpelling ?? new FinalSpelling(rootWritten, context.baseSpelling?.current().cells) : undefined;
  const rootEdits: MorphologyRootEdit[] | undefined = context.trace ? [] : undefined;
  const fired: FiredMorphophonemicRule[] = [];
  for (const { rule, event, ruleIndex } of prepared.rules) {
    const writtenEvent = { ...event };
    if (rule.writtenMatch && rule.writtenReplace !== undefined) {
      const applied = rootEdits ? replaceWithSpellingEdits(rootWritten, rule.writtenMatch, rule.writtenReplace) : undefined;
      const rewritten = applied ? applied.surface : rootWritten.replace(rule.writtenMatch, rule.writtenReplace);
      if (applied) rootEdits!.push({ phase: "morphophonemic", boundary: event.boundary,
        rule: rule.name, ruleIndex, before: rootWritten, after: rewritten, edits: applied.edits });
      if (rewritten !== rootWritten) {
        writtenEvent.writtenBefore = rootWritten;
        writtenEvent.writtenAfter = rewritten;
        rootWritten = rewritten;
      }
    }
    if (writtenEvent.soundBefore !== undefined || writtenEvent.writtenBefore !== undefined) fired.push(writtenEvent);
  }
  for (const part of ["prefix", "suffix"] as const) {
    const affix = plan[part];
    if (affix?.boundaryTransforms) rootWritten = applyBoundaryTransforms(rootWritten, affix.boundaryTransforms,
      rootEdits ? event => rootEdits.push({ phase: "boundary", boundary: part === "prefix" ? "prefix-root" : "root-suffix", ...event }) : undefined);
  }
  if (finalSpelling) {
    for (const event of rootEdits ?? []) finalSpelling.applyRootEdits(event.before, event.after, event.edits,
      `${event.phase}:${event.boundary}:${event.ruleIndex}:${event.rule}`);
    if (prefix) finalSpelling.attach("prefix", prefixWritten);
    if (suffix) finalSpelling.attach("suffix", suffixWritten);
    context.finalSpelling = finalSpelling;
  }
  if (context.trace?.morphologyTrace && fired.length > 0) context.trace.morphologyTrace.alternations = fired;
  context.word.written.clean = prefixWritten + rootWritten + suffixWritten;

  const parts: MorphologyWrittenPart[] = [];
  if (prefix) parts.push({ role: "prefix", text: prefixWritten });
  parts.push({ role: "root", text: rootWritten });
  if (suffix) parts.push({ role: "suffix", text: suffixWritten });
  context.word.written.hyphenated = parts.filter(part => part.role === "root" || part.text).map(part => part.text).join("-");
  if (context.trace?.morphologyTrace) {
    context.trace.morphologyTrace.realization = {
      prefix, suffix,
      ...(selectionPhones ? { selectionPhones } : {}),
      configurationIndices,
      ...(phoneAssembly ? { phoneAssembly } : {}),
      ...(rootEdits ? { rootEdits } : {}),
      ...(finalSpelling ? { finalSpelling: finalSpelling.snapshot() } : {}),
      assembledParts: snapshotWrittenParts(parts),
      emittedParts: snapshotWrittenParts(parts),
    };
  }
  return { prefix, suffix, parts, ...(finalSpelling ? { spelling: finalSpelling } : {}) };
}


export function morphologyRegexState(plan: MorphologyPlan): MorphologyRegexState[] {
  const result: MorphologyRegexState[] = [];
  for (const part of ["prefix", "suffix"] as const) {
    const affix = plan[part];
    affix?.morphophonemicRules?.forEach((rule, index) => {
      if (rule.writtenMatch) result.push({ part, phase: "morphophonemic", index, lastIndex: rule.writtenMatch.lastIndex });
    });
    affix?.boundaryTransforms?.forEach((rule, index) => {
      result.push({ part, phase: "boundary", index, lastIndex: rule.match.lastIndex });
    });
  }
  return result;
}

/** Attach morphology to an already-spelled lexical root; surface realization is separate. */
export function applyMorphology(rt: GeneratorRuntime, context: WordGenerationContext, plan: MorphologyPlan): MorphologyResult {
  const prepared = prepareMorphology(rt, context, plan);
  return prepared ? writeMorphology(context, prepared) : { parts: [{ role: "root", text: context.word.written.clean }] };
}

export function prepareMorphology(rt: GeneratorRuntime, context: WordGenerationContext, plan: MorphologyPlan): PreparedMorphology | undefined {
  const trace = context.trace;
  if (!trace) return prepareMorphologyOperations(rt, context, plan);
  const before = structuredClone(context.word);
  const phonesBefore = context.finalPhoneState?.ledger.snapshot(context.finalPhoneState.ids, context.word.syllables);
  const regexBefore = morphologyRegexState(plan);
  const structuralStart = trace.structural.length;
  const rolls: number[] = [];
  const active = { ...context, rand: () => {
    const value = context.rand(); rolls.push(value); return value;
  } };
  const prepared = prepareMorphologyOperations(rt, active, plan);
  context.finalPhoneState = active.finalPhoneState;
  const phonesAfter = context.finalPhoneState?.ledger.snapshot(context.finalPhoneState.ids, context.word.syllables);
  trace.morphologyPreparation = { version: 1, template: plan.template,
    configurationIndices: {
      ...(plan.prefix ? { prefix: rt.config.morphology?.prefixes.indexOf(plan.prefix) ?? -1 } : {}),
      ...(plan.suffix ? { suffix: rt.config.morphology?.suffixes.indexOf(plan.suffix) ?? -1 } : {}),
    }, before, after: structuredClone(context.word), rolls, regexBefore, regexAfter: morphologyRegexState(plan),
    structural: structuredClone(trace.structural.slice(structuralStart)), phonesBefore, phonesAfter,
    ...(prepared ? { prepared: { prefix: prepared.prefix ? structuredClone(prepared.prefix) : undefined, suffix: prepared.suffix ? structuredClone(prepared.suffix) : undefined,
      rootSyllableStart: prepared.rootSyllableStart,
      ...(prepared.evaluations ? { evaluations: structuredClone(prepared.evaluations) } : {}),
      rules: prepared.rules.map(({ ruleIndex, event }) => ({ ruleIndex, boundary: event.boundary, rule: event.rule })) } } : {}),
  };
  return prepared;
}

export function writeMorphology(context: WordGenerationContext, prepared: PreparedMorphology): MorphologyResult {
  const trace = context.trace;
  if (!trace) return writeMorphologyOperations(context, prepared);
  const before = structuredClone(context.word);
  const spellingBefore = context.finalSpelling?.snapshot();
  const regexBefore = morphologyRegexState(prepared.plan);
  const structuralStart = trace.structural.length;
  const rolls: number[] = [];
  const active = { ...context, rand: () => {
    const value = context.rand(); rolls.push(value); return value;
  } };
  const result = writeMorphologyOperations(active, prepared);
  context.finalSpelling = active.finalSpelling;
  trace.morphologyWriting = { version: 1, before, after: structuredClone(context.word), rolls,
    regexBefore, regexAfter: morphologyRegexState(prepared.plan),
    structural: structuredClone(trace.structural.slice(structuralStart)),
    spellingBefore, spellingAfter: context.finalSpelling?.snapshot(),
    ...(trace.morphologyTrace?.realization ? { realization: structuredClone(trace.morphologyTrace.realization) } : {}),
  };
  return result;
}
