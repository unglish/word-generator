import { Phoneme, Syllable, WordGenerationContext } from "../../types.js";
import { Affix, AllomorphVariant, AffixSyllable, BoundaryTransform, MorphophonemicRule, PhonologicalCondition, defaultFallbackBridgeOnsets, resolveAspirationRules } from "../../config/language.js";
import { generatePronunciation, PronunciationRuntimeConfig } from "../pronounce.js";
import getWeightedOption from "../../utils/getWeightedOption.js";
import type { MorphologyPlan } from "./plan.js";
import { snapshotAffixForm, snapshotWrittenParts } from "./realization.js";
import type { MorphologyResult, MorphologyWrittenPart, ResolvedAffix } from "./realization.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GeneratorRuntime {
  config: {
    morphology?: import("../../config/language.js").MorphologyConfig;
    phonemes: Phoneme[];
    pronunciation?: import("../../config/language.js").PronunciationConfig;
  };
  resolvedPronunciation?: PronunciationRuntimeConfig;
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
      event: boundary === "prefix-root" ? "morphPrefixHiatusFallback" : "morphSuffixHiatusFallback",
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
      leftNucleus: left.nucleus.map(phone => phone.sound),
      rightNucleus: right.nucleus.map(phone => phone.sound),
      fallbackEnabled,
      outcome: bridge ? "inserted" : fallbackEnabled ? "no-bridge-candidate" : "preserved",
      inserted: bridge?.sound,
    });
  }
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

export function applyBoundaryTransforms(rootWritten: string, transforms: BoundaryTransform[]): string {
  const fired = new Set<string>();
  let result = rootWritten;
  for (const t of transforms) {
    if (t.blockedBy && t.blockedBy.some(name => fired.has(name))) continue;
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

function applyMorphophonemicRules(
  rootSyllables: Syllable[],
  rootWritten: string,
  affix: Affix,
  isPrefix: boolean,
  resolvePhoneme: (sound: string) => Phoneme,
): { rootWritten: string; fired: FiredMorphophonemicRule[] } {
  if (!affix.morphophonemicRules || affix.morphophonemicRules.length === 0) {
    return { rootWritten, fired: [] };
  }

  const sortedRules = [...affix.morphophonemicRules].sort(
    (a, b) => (a.priority ?? 100) - (b.priority ?? 100),
  );
  const fired: FiredMorphophonemicRule[] = [];
  let written = rootWritten;

  for (const rule of sortedRules) {
    const boundaryRef = getBoundarySegmentRef(rootSyllables, isPrefix, rule.target ?? "edge");
    if (!boundaryRef) continue;
    if (
      rule.phonologicalCondition
      && !matchesPhonologicalCondition(rule.phonologicalCondition, boundaryRef.phoneme, isPrefix)
    ) {
      continue;
    }

    let changed = false;
    const event: FiredMorphophonemicRule = {
      rule: rule.name,
      affix: affix.written,
      boundary: isPrefix ? "prefix-root" : "root-suffix",
    };

    if (rule.replaceSound && rule.replaceSound !== boundaryRef.phoneme.sound) {
      const next = resolvePhoneme(rule.replaceSound);
      rootSyllables[boundaryRef.syllableIndex][boundaryRef.segment][boundaryRef.index] = next;
      event.soundBefore = boundaryRef.phoneme.sound;
      event.soundAfter = next.sound;
      changed = true;
    }

    if (rule.writtenMatch && rule.writtenReplace !== undefined) {
      const rewritten = written.replace(rule.writtenMatch, rule.writtenReplace);
      if (rewritten !== written) {
        event.writtenBefore = written;
        event.writtenAfter = rewritten;
        written = rewritten;
        changed = true;
      }
    }

    if (changed) {
      fired.push(event);
    }
  }

  return { rootWritten: written, fired };
}

// ---------------------------------------------------------------------------
// Main API
// ---------------------------------------------------------------------------

export function applyMorphology(
  rt: GeneratorRuntime,
  context: WordGenerationContext,
  plan: MorphologyPlan,
): MorphologyResult {
  if (plan.template === "bare") return { parts: [{ role: "root", text: context.word.written.clean }] };

  const config = rt.config;
  const syllables = context.word.syllables;
  let rootWritten = context.word.written.clean;

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

  const firedMorphophonemics: FiredMorphophonemicRule[] = [];
  if (plan.prefix && prefixVariant) {
    const applied = applyMorphophonemicRules(
      syllables,
      rootWritten,
      plan.prefix,
      true,
      resolvePhoneme,
    );
    rootWritten = applied.rootWritten;
    firedMorphophonemics.push(...applied.fired);
  }
  if (plan.suffix && suffixVariant) {
    const applied = applyMorphophonemicRules(
      syllables,
      rootWritten,
      plan.suffix,
      false,
      resolvePhoneme,
    );
    rootWritten = applied.rootWritten;
    firedMorphophonemics.push(...applied.fired);
  }

  // Apply boundary transforms to root written form at both boundaries.
  if (plan.prefix && prefixVariant && plan.prefix.boundaryTransforms) {
    rootWritten = applyBoundaryTransforms(rootWritten, plan.prefix.boundaryTransforms);
  }
  if (plan.suffix && suffixVariant && plan.suffix.boundaryTransforms) {
    rootWritten = applyBoundaryTransforms(rootWritten, plan.suffix.boundaryTransforms);
  }

  const prefixWritten = prefixVariant?.written ?? "";
  const suffixWritten = suffixVariant?.written ?? "";
  const cleanForm = prefixWritten + rootWritten + suffixWritten;

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

  // Handle zero-syllable affixes: append phonemes directly to root coda/onset
  if (suffixVariant && suffixVariant.syllableCount === 0 && suffixSyllables.length === 0 && suffixVariant.phonemes.length > 0) {
    const lastSyl = syllables[syllables.length - 1];
    for (const s of suffixVariant.phonemes) {
      lastSyl.coda.push(resolvePhoneme(s));
    }
  } else if (suffixVariant && suffixVariant.syllableCount === 0 && suffixSyllables.length > 0) {
    const lastSyl = syllables[syllables.length - 1];
    for (const ss of suffixSyllables) {
      lastSyl.coda.push(...ss.onset, ...ss.nucleus, ...ss.coda);
    }
    suffixSyllables.length = 0;
  }

  if (prefixVariant && prefixVariant.syllableCount === 0 && prefixSyllables.length === 0 && prefixVariant.phonemes.length > 0) {
    const firstSyl = syllables[0];
    for (const s of prefixVariant.phonemes) {
      firstSyl.onset.unshift(resolvePhoneme(s));
    }
  } else if (prefixVariant && prefixVariant.syllableCount === 0 && prefixSyllables.length > 0) {
    const firstSyl = syllables[0];
    for (const ps of prefixSyllables) {
      firstSyl.onset.unshift(...ps.onset, ...ps.nucleus, ...ps.coda);
    }
    prefixSyllables.length = 0;
  }

  if (prefixSyllables.length > 0 && syllables.length > 0) {
    realizeBoundaryHiatus(
      rt, context, prefixSyllables[prefixSyllables.length - 1], syllables[0],
      "prefix-root", prefixSyllables.length, canApplyPrefixRootFallback(rt),
    );
  }

  if (suffixSyllables.length > 0 && syllables.length > 0) {
    realizeBoundaryHiatus(
      rt, context, syllables[syllables.length - 1], suffixSyllables[0],
      "root-suffix", prefixSyllables.length + syllables.length, canApplyRootSuffixFallback(rt),
    );
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

  const pronunciation = rt.resolvedPronunciation ?? {
    aspiration: resolveAspirationRules(config.pronunciation?.aspiration),
    vowelReduction: config.pronunciation?.vowelReduction,
  };
  generatePronunciation(context, pronunciation);

  context.word.written.clean = cleanForm;
  if (context.trace?.morphologyTrace && firedMorphophonemics.length > 0) {
    context.trace.morphologyTrace.alternations = firedMorphophonemics;
  }

  const parts: MorphologyWrittenPart[] = [];
  if (prefix) parts.push({ role: "prefix", text: prefixWritten });
  parts.push({ role: "root", text: rootWritten });
  if (suffix) parts.push({ role: "suffix", text: suffixWritten });
  context.word.written.hyphenated = parts.filter(part => part.role === "root" || part.text).map(part => part.text).join("-");
  if (context.trace?.morphologyTrace) {
    context.trace.morphologyTrace.realization = {
      prefix, suffix,
      assembledParts: snapshotWrittenParts(parts),
      emittedParts: snapshotWrittenParts(parts),
    };
  }
  return { prefix, suffix, parts };
}
