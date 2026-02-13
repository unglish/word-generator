import { Phoneme, Syllable, WordGenerationContext, GenerationMode } from "../types.js";
import { MorphologyConfig, Affix, AllomorphVariant } from "../config/language.js";
import { generatePronunciation } from "./pronounce.js";
import getWeightedOption from "../utils/getWeightedOption.js";
import type { RNG } from "../utils/random.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Template = "bare" | "suffixed" | "prefixed" | "both";

interface MorphologyPlan {
  template: Template;
  prefix?: Affix;
  suffix?: Affix;
  /** Resolved prefix allomorph (set after root is generated). */
  prefixVariant?: { phonemes: string[]; syllableCount: number; written: string };
  /** Resolved suffix allomorph (set after root is generated). */
  suffixVariant?: { phonemes: string[]; syllableCount: number; written: string };
}

interface GeneratorRuntime {
  config: {
    morphology?: MorphologyConfig;
    phonemes: Phoneme[];
    vowelReduction?: import("../config/language.js").VowelReductionConfig;
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NEVER_DOUBLE = new Set(["v", "w", "x", "y", "q", "j", "h", "k"]);
const VOWELS = new Set(["a", "e", "i", "o", "u"]);
const CONSONANTS_RE = /[bcdfghjklmnpqrstvwxyz]/i;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pickWeighted<T>(items: T[], getWeight: (item: T) => number, rand: RNG): T {
  const options: [T, number][] = items.map(item => [item, getWeight(item)]);
  return getWeightedOption(options, rand);
}

function pickTemplate(config: MorphologyConfig, mode: GenerationMode, rand: RNG): Template {
  const w = config.templateWeights[mode];
  return getWeightedOption<Template>([
    ["bare", w.bare],
    ["suffixed", w.suffixed],
    ["prefixed", w.prefixed],
    ["both", w.both],
  ], rand);
}

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

function resolveAllomorph(
  affix: Affix,
  phoneme: Phoneme | undefined,
  isPrefix: boolean,
): { phonemes: string[]; syllableCount: number; written: string } {
  const base = { phonemes: affix.phonemes, syllableCount: affix.syllableCount, written: affix.written };
  if (!affix.allomorphs || !phoneme) return base;

  // Sort by specificity: sibilant/alveolar-stop/before-bilabial before voiceless/voiced
  const sorted = [...affix.allomorphs].sort((a, b) => {
    const specificity = (c: string) =>
      c === "after-sibilant" || c === "after-alveolar-stop" || c === "before-bilabial" ? 0 : 1;
    return specificity(a.condition) - specificity(b.condition);
  });

  for (const variant of sorted) {
    if (matchesCondition(variant.condition, phoneme, isPrefix)) {
      return {
        phonemes: variant.phonemes,
        syllableCount: variant.syllableCount,
        written: variant.written ?? affix.written,
      };
    }
  }
  return base;
}

function matchesCondition(
  condition: AllomorphVariant["condition"],
  phoneme: Phoneme,
  isPrefix: boolean,
): boolean {
  switch (condition) {
    case "after-voiceless":
      return !isPrefix && !phoneme.voiced;
    case "after-voiced":
      return !isPrefix && phoneme.voiced;
    case "after-sibilant":
      return !isPrefix && phoneme.mannerOfArticulation === "sibilant";
    case "after-alveolar-stop":
      return !isPrefix && phoneme.mannerOfArticulation === "stop" && phoneme.placeOfArticulation === "alveolar";
    case "before-bilabial":
      return isPrefix && phoneme.placeOfArticulation === "bilabial";
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Boundary rules
// ---------------------------------------------------------------------------

function applyBoundaryRules(rootWritten: string, affix: Affix): string {
  if (!affix.boundaryRules) return rootWritten;
  let result = rootWritten;

  if (affix.boundaryRules.yToI && result.length >= 2) {
    const last = result[result.length - 1];
    const secondLast = result[result.length - 2];
    if (last === "y" && !VOWELS.has(secondLast.toLowerCase())) {
      result = result.slice(0, -1) + "i";
    }
  }

  if (affix.boundaryRules.dropSilentE && result.endsWith("e")) {
    result = result.slice(0, -1);
  }

  if (affix.boundaryRules.doubleConsonant && result.length >= 2) {
    const lastChar = result[result.length - 1].toLowerCase();
    const secondLastChar = result[result.length - 2].toLowerCase();
    if (
      CONSONANTS_RE.test(lastChar) &&
      !NEVER_DOUBLE.has(lastChar) &&
      VOWELS.has(secondLastChar) &&
      // Check single vowel preceded by non-vowel (or start of word)
      (result.length < 3 || !VOWELS.has(result[result.length - 3].toLowerCase()))
    ) {
      result = result + lastChar;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Syllable construction from affix phonemes
// ---------------------------------------------------------------------------

function phonemeSoundsToSyllables(sounds: string[], inventory: Phoneme[]): Syllable[] {
  if (sounds.length === 0) return [];

  const phonemeMap = new Map<string, Phoneme>();
  for (const p of inventory) {
    phonemeMap.set(p.sound, p);
  }

  const resolved: Phoneme[] = sounds.map(s => {
    const p = phonemeMap.get(s);
    if (!p) {
      // Create a minimal phoneme for unknown sounds
      return {
        sound: s, voiced: true,
        mannerOfArticulation: "midVowel" as const,
        placeOfArticulation: "central" as const,
        startWord: 1, midWord: 1, endWord: 1,
      };
    }
    return p;
  });

  function isVowel(p: Phoneme): boolean {
    return ["highVowel", "midVowel", "lowVowel"].includes(p.mannerOfArticulation);
  }

  // Simple heuristic: split into syllables at vowel boundaries
  const syllables: Syllable[] = [];
  let onset: Phoneme[] = [];
  let nucleus: Phoneme[] = [];
  let coda: Phoneme[] = [];
  let inNucleus = false;

  for (const p of resolved) {
    if (isVowel(p)) {
      if (inNucleus && nucleus.length > 0) {
        // New vowel after vowel — flush current syllable, start new one
        syllables.push({ onset, nucleus, coda, stress: undefined });
        onset = [];
        nucleus = [p];
        coda = [];
      } else {
        inNucleus = true;
        nucleus.push(p);
      }
    } else {
      if (inNucleus) {
        // Consonant after vowel — goes to coda (may be re-assigned to next onset)
        coda.push(p);
      } else {
        onset.push(p);
      }
    }
  }

  // Flush final syllable
  if (nucleus.length > 0 || onset.length > 0 || coda.length > 0) {
    syllables.push({ onset, nucleus, coda, stress: undefined });
  }

  // If no vowel found, put everything in one syllable
  if (syllables.length === 0) {
    syllables.push({ onset: resolved, nucleus: [], coda: [], stress: undefined });
  }

  return syllables;
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
    // Demote existing primary to secondary
    for (const syl of syllables) {
      if (syl.stress === "ˈ") syl.stress = "ˌ";
    }
    syllables[affixSyllableIndices[0]].stress = "ˈ";
  } else if (stressEffect === "secondary") {
    syllables[affixSyllableIndices[0]].stress = "ˌ";
  } else if (stressEffect === "attract-preceding" && !isPrefix) {
    // The syllable immediately before the suffix gets primary stress
    const firstAffixIdx = affixSyllableIndices[0];
    if (firstAffixIdx > 0) {
      for (const syl of syllables) {
        if (syl.stress === "ˈ") syl.stress = "ˌ";
      }
      syllables[firstAffixIdx - 1].stress = "ˈ";
    }
  }
}

// ---------------------------------------------------------------------------
// Main API
// ---------------------------------------------------------------------------

/**
 * Plan morphology BEFORE root generation — picks template and affixes,
 * returns the plan and the syllable count adjustment.
 */
export function planMorphology(
  config: MorphologyConfig,
  mode: GenerationMode,
  rand: RNG,
): { plan: MorphologyPlan; syllableReduction: number } {
  const template = pickTemplate(config, mode, rand);

  if (template === "bare") {
    return { plan: { template }, syllableReduction: 0 };
  }

  const plan: MorphologyPlan = { template };
  let reduction = 0;

  if (template === "prefixed" || template === "both") {
    plan.prefix = pickWeighted(config.prefixes, a => a.frequency, rand);
    reduction += plan.prefix.syllableCount;
  }
  if (template === "suffixed" || template === "both") {
    plan.suffix = pickWeighted(config.suffixes, a => a.frequency, rand);
    reduction += plan.suffix.syllableCount;
  }

  return { plan, syllableReduction: reduction };
}

/**
 * Apply a morphology plan to a generated root word.
 * Mutates `context.word` in place.
 */
export function applyMorphology(
  rt: GeneratorRuntime,
  context: WordGenerationContext,
  plan: MorphologyPlan,
): void {
  if (plan.template === "bare") return;

  const config = rt.config;
  const syllables = context.word.syllables;
  let rootWritten = context.word.written.clean;

  // Resolve allomorphs now that we have the root
  let prefixVariant: MorphologyPlan["prefixVariant"];
  let suffixVariant: MorphologyPlan["suffixVariant"];

  if (plan.prefix) {
    const firstPhoneme = getFirstPhoneme(context);
    prefixVariant = resolveAllomorph(plan.prefix, firstPhoneme, true);
  }

  if (plan.suffix) {
    const lastPhoneme = getLastPhoneme(context);
    suffixVariant = resolveAllomorph(plan.suffix, lastPhoneme, false);
  }

  // Apply boundary rules to root written form (suffix only)
  if (plan.suffix && suffixVariant) {
    rootWritten = applyBoundaryRules(rootWritten, plan.suffix);
  }

  // Build written form
  const prefixWritten = prefixVariant?.written ?? "";
  const suffixWritten = suffixVariant?.written ?? "";
  const cleanForm = prefixWritten + rootWritten + suffixWritten;

  // Build syllables from affixes
  const inventory = config.phonemes;
  const prefixSyllables = prefixVariant
    ? phonemeSoundsToSyllables(prefixVariant.phonemes, inventory)
    : [];
  const suffixSyllables = suffixVariant
    ? phonemeSoundsToSyllables(suffixVariant.phonemes, inventory)
    : [];

  // Handle zero-syllable affixes (e.g. -ed → /t/ or /d/): append to last syllable's coda
  if (suffixVariant && suffixVariant.syllableCount === 0 && suffixSyllables.length > 0) {
    const lastSyl = syllables[syllables.length - 1];
    // Flatten all phonemes from suffix syllables into coda
    for (const ss of suffixSyllables) {
      lastSyl.coda.push(...ss.onset, ...ss.nucleus, ...ss.coda);
    }
    suffixSyllables.length = 0;
  }

  // Similarly for zero-syllable prefixes
  if (prefixVariant && prefixVariant.syllableCount === 0 && prefixSyllables.length > 0) {
    const firstSyl = syllables[0];
    for (const ps of prefixSyllables) {
      firstSyl.onset.unshift(...ps.onset, ...ps.nucleus, ...ps.coda);
    }
    prefixSyllables.length = 0;
  }

  // Prepend/append affix syllables
  const prefixIndices: number[] = [];
  const suffixIndices: number[] = [];

  for (let i = 0; i < prefixSyllables.length; i++) {
    prefixIndices.push(i);
  }
  context.word.syllables = [...prefixSyllables, ...syllables, ...suffixSyllables];
  for (let i = 0; i < suffixSyllables.length; i++) {
    suffixIndices.push(prefixSyllables.length + syllables.length + i);
  }

  // Adjust stress
  if (plan.prefix && prefixIndices.length > 0) {
    adjustStress(context.word.syllables, plan.prefix.stressEffect, prefixIndices, true);
  }
  if (plan.suffix && suffixIndices.length > 0) {
    adjustStress(context.word.syllables, plan.suffix.stressEffect, suffixIndices, false);
  }

  // Regenerate pronunciation
  generatePronunciation(context, config.vowelReduction);

  // Set written form
  context.word.written.clean = cleanForm;

  // Build hyphenated form
  const parts: string[] = [];
  if (prefixWritten) parts.push(prefixWritten);
  parts.push(rootWritten);
  if (suffixWritten) parts.push(suffixWritten);
  context.word.written.hyphenated = parts.join("-");
}
