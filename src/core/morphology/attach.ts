import { Phoneme, Syllable, WordGenerationContext } from "../../types.js";
import { Affix, AllomorphVariant, AffixSyllable, BoundaryTransform, PhonologicalCondition, defaultFallbackBridgeOnsets } from "../../config/language.js";
import { generatePronunciation } from "../pronounce.js";
import getWeightedOption from "../../utils/getWeightedOption.js";
import type { MorphologyPlan } from "./plan.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GeneratorRuntime {
  config: {
    morphology?: import("../../config/language.js").MorphologyConfig;
    phonemes: Phoneme[];
    vowelReduction?: import("../../config/language.js").VowelReductionConfig;
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
  if (condition.voiced !== undefined && phoneme.voiced !== condition.voiced) return false;
  if (condition.manner && !condition.manner.includes(phoneme.mannerOfArticulation)) return false;
  if (condition.place && !condition.place.includes(phoneme.placeOfArticulation)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Allomorph resolution
// ---------------------------------------------------------------------------

function resolveAllomorph(
  affix: Affix,
  phoneme: Phoneme | undefined,
  isPrefix: boolean,
): { phonemes: string[]; syllables?: AffixSyllable[]; syllableCount: number; written: string } {
  const base = { phonemes: affix.phonemes, syllables: affix.syllables, syllableCount: affix.syllableCount, written: affix.written };
  if (!affix.allomorphs || !phoneme) return base;

  // Sort by specificity: conditions with manner/place constraints before voiced-only
  const sorted = [...affix.allomorphs].sort((a, b) => {
    const specificity = (v: AllomorphVariant) => {
      return (v.phonologicalCondition.manner || v.phonologicalCondition.place) ? 0 : 1;
    };
    return specificity(a) - specificity(b);
  });

  for (const variant of sorted) {
    if (matchesPhonologicalCondition(variant.phonologicalCondition, phoneme, isPrefix)) {
      return {
        phonemes: variant.phonemes,
        syllables: variant.syllables,
        syllableCount: variant.syllableCount,
        written: variant.written ?? affix.written,
      };
    }
  }
  return base;
}

// ---------------------------------------------------------------------------
// AffixSyllable -> Syllable conversion
// ---------------------------------------------------------------------------

function affixSyllablesToSyllables(templates: AffixSyllable[], inventory: Phoneme[]): Syllable[] {
  const phonemeMap = new Map<string, Phoneme>();
  for (const p of inventory) {
    phonemeMap.set(p.sound, p);
  }

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

// ---------------------------------------------------------------------------
// Main API
// ---------------------------------------------------------------------------

export function applyMorphology(
  rt: GeneratorRuntime,
  context: WordGenerationContext,
  plan: MorphologyPlan,
): void {
  if (plan.template === "bare") return;

  const config = rt.config;
  const syllables = context.word.syllables;
  let rootWritten = context.word.written.clean;

  let prefixVariant: { phonemes: string[]; syllables?: AffixSyllable[]; syllableCount: number; written: string } | undefined;
  let suffixVariant: { phonemes: string[]; syllables?: AffixSyllable[]; syllableCount: number; written: string } | undefined;

  if (plan.prefix) {
    const firstPhoneme = getFirstPhoneme(context);
    prefixVariant = resolveAllomorph(plan.prefix, firstPhoneme, true);
  }

  if (plan.suffix) {
    const lastPhoneme = getLastPhoneme(context);
    suffixVariant = resolveAllomorph(plan.suffix, lastPhoneme, false);
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

  const inventory = config.phonemes;
  const phonemeMap = new Map<string, Phoneme>();
  for (const p of inventory) {
    phonemeMap.set(p.sound, p);
  }

  function resolvePhoneme(sound: string): Phoneme {
    return phonemeMap.get(sound) ?? {
      sound, voiced: true,
      mannerOfArticulation: "midVowel" as const,
      placeOfArticulation: "central" as const,
      startWord: 1, midWord: 1, endWord: 1,
    };
  }

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

  // Prefix/root vowel-hiatus fallback at phoneme boundary.
  if (canApplyPrefixRootFallback(rt) && prefixSyllables.length > 0 && syllables.length > 0) {
    const lastPrefix = prefixSyllables[prefixSyllables.length - 1];
    const firstRoot = syllables[0];
    if (lastPrefix.coda.length === 0 && firstRoot.onset.length === 0) {
      const bridge = pickBoundaryBridge(rt, context);
      if (bridge) {
        firstRoot.onset.unshift(bridge);
        context.trace?.recordStructural(
          "morphPrefixHiatusFallback",
          `inserted /${bridge.sound}/ at prefix-root boundary`
        );
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
        context.trace?.recordStructural(
          "morphSuffixHiatusFallback",
          `inserted /${bridge.sound}/ at root-suffix boundary`
        );
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

  generatePronunciation(context, config.vowelReduction);

  context.word.written.clean = cleanForm;

  const parts: string[] = [];
  if (prefixWritten) parts.push(prefixWritten);
  parts.push(rootWritten);
  if (suffixWritten) parts.push(suffixWritten);
  context.word.written.hyphenated = parts.join("-");
}
