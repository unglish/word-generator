import { Phoneme, Grapheme, GraphemeCondition, WordGenerationContext } from "../types.js";
import { LanguageConfig, DoublingConfig, SpellingRule } from "../config/language.js";
import { getRand } from '../utils/random.js';
import getWeightedOption from "../utils/getWeightedOption.js";

/**
 * Pre-computed cumulative frequency tables for a set of grapheme maps,
 * keyed by syllable position then phoneme sound.
 */
type CumulativeFrequencyTable = {
  onset: Map<string, number[]>;
  nucleus: Map<string, number[]>;
  coda: Map<string, number[]>;
};

/**
 * Build cumulative frequency lookup tables from grapheme maps.
 * Uses each grapheme's `frequency` field for weighting, matching the
 * original logic in `graphemes/index.ts`.
 */
function buildCumulativeFrequencies(
  graphemeMaps: LanguageConfig["graphemeMaps"],
): CumulativeFrequencyTable {
  const result: CumulativeFrequencyTable = {
    onset: new Map(),
    nucleus: new Map(),
    coda: new Map(),
  };

  for (const position of ["onset", "nucleus", "coda"] as const) {
    for (const [sound, graphemeList] of graphemeMaps[position]) {
      let cumulative = 0;
      const cumulatives: number[] = [];
      for (const g of graphemeList) {
        cumulative += g.frequency;
        cumulatives.push(cumulative);
      }
      result[position].set(sound, cumulatives);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Spelling rules (config-driven post-processing)
// ---------------------------------------------------------------------------

interface CompiledSpellingRule {
  name: string;
  regex: RegExp;
  replacement: string;
  probability: number;
}

function compileSpellingRules(rules: SpellingRule[]): CompiledSpellingRule[] {
  return rules.map(rule => ({
    name: rule.name,
    regex: new RegExp(rule.pattern, rule.flags ?? "g"),
    replacement: rule.replacement,
    probability: rule.probability ?? 100,
  }));
}

function adjustSyllable(str: string, compiledRules: CompiledSpellingRule[]): string {
  let result = str;
  for (const { regex, replacement, probability } of compiledRules) {
    // Reset lastIndex for stateful regexes
    regex.lastIndex = 0;
    if (probability >= 100) {
      result = result.replace(regex, replacement);
    } else {
      // Apply probabilistically per match
      result = result.replace(regex, (match, ...args) => {
        if (getRand()() < probability / 100) {
          // Manually apply replacement with capture group substitution
          let rep = replacement;
          for (let i = 0; i < args.length - 2; i++) {
            if (args[i] !== undefined) {
              rep = rep.replace(`$${i + 1}`, args[i]);
            }
          }
          return rep;
        }
        return match;
      });
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Context conditioning
// ---------------------------------------------------------------------------

/**
 * Build category shorthand → Set<string> maps from a phoneme inventory.
 * Used to expand conditions like "lax-vowel" into actual phoneme sounds.
 */
function buildCategorySets(phonemes: Phoneme[]): Map<string, Set<string>> {
  const categories = new Map<string, Set<string>>();
  categories.set("lax-vowel", new Set());
  categories.set("tense-vowel", new Set());
  categories.set("front-vowel", new Set());
  categories.set("vowel", new Set());
  categories.set("consonant", new Set());

  for (const p of phonemes) {
    const isVowel =
      p.mannerOfArticulation === "highVowel" ||
      p.mannerOfArticulation === "midVowel" ||
      p.mannerOfArticulation === "lowVowel";

    if (isVowel) {
      categories.get("vowel")!.add(p.sound);
      if (p.tense === false) {
        categories.get("lax-vowel")!.add(p.sound);
      }
      if (p.tense === true) {
        categories.get("tense-vowel")!.add(p.sound);
      }
      if (p.placeOfArticulation === "front") {
        categories.get("front-vowel")!.add(p.sound);
      }
    } else {
      categories.get("consonant")!.add(p.sound);
    }
  }

  return categories;
}

/**
 * Expand a context list (which may contain category shorthands) into a Set of phoneme sounds.
 */
function expandContext(ctx: string[], categories: Map<string, Set<string>>): Set<string> {
  const result = new Set<string>();
  for (const item of ctx) {
    const cat = categories.get(item);
    if (cat) {
      for (const s of cat) result.add(s);
    } else {
      result.add(item);
    }
  }
  return result;
}

/**
 * Check if a grapheme's condition is met given the current context.
 */
function meetsCondition(
  condition: GraphemeCondition | undefined,
  prevPhoneme: Phoneme | undefined,
  nextPhoneme: Phoneme | undefined,
  isStartOfWord: boolean,
  isEndOfWord: boolean,
  totalPhonemes: number,
  phonemeIndex: number,
  categories: Map<string, Set<string>>,
): boolean {
  if (!condition) return true;

  // Check wordPosition
  if (condition.wordPosition) {
    let positionMatch = false;
    const isInitial = isStartOfWord || phonemeIndex === 0;
    const isFinal = isEndOfWord || phonemeIndex === totalPhonemes - 1;
    const isMedial = !isInitial && !isFinal;

    for (const pos of condition.wordPosition) {
      if (pos === "initial" && isInitial) positionMatch = true;
      if (pos === "final" && isFinal) positionMatch = true;
      if (pos === "medial" && isMedial) positionMatch = true;
    }
    if (!positionMatch) return false;
  }

  // Check leftContext
  if (condition.leftContext) {
    if (!prevPhoneme) return false;
    const expanded = expandContext(condition.leftContext, categories);
    if (!expanded.has(prevPhoneme.sound)) return false;
  }

  // Check rightContext
  if (condition.rightContext) {
    if (!nextPhoneme) return false;
    const expanded = expandContext(condition.rightContext, categories);
    if (!expanded.has(nextPhoneme.sound)) return false;
  }

  // Check notLeftContext
  if (condition.notLeftContext) {
    if (prevPhoneme) {
      const expanded = expandContext(condition.notLeftContext, categories);
      if (expanded.has(prevPhoneme.sound)) return false;
    }
  }

  // Check notRightContext
  if (condition.notRightContext) {
    if (nextPhoneme) {
      const expanded = expandContext(condition.notRightContext, categories);
      if (expanded.has(nextPhoneme.sound)) return false;
    }
  }

  return true;
}

// ---------------------------------------------------------------------------
// Doubling logic
// ---------------------------------------------------------------------------

interface DoublingContext {
  doublingCount: number;
}

function shouldDoubleConsonant(
  config: DoublingConfig | undefined,
  currPhoneme: Phoneme,
  prevPhoneme: Phoneme | undefined,
  nextNucleus: Phoneme | undefined,
  form: string,
  position: "onset" | "nucleus" | "coda",
  isCluster: boolean,
  isEndOfWord: boolean,
  syllableStress: string | undefined,
  prevReduced: boolean,
  doublingCtx: DoublingContext,
): boolean {
  if (!config || !config.enabled) return false;
  if (!prevPhoneme) return false;
  if (isCluster) return false;
  if (form.length !== 1) return false;

  // Only consonant positions
  if (position !== "onset" && position !== "coda") return false;

  // Check maxPerWord
  if (doublingCtx.doublingCount >= config.maxPerWord) return false;

  // Check trigger
  if (config.trigger === "lax-vowel") {
    const isAfterVowel = prevPhoneme.nucleus != null && prevPhoneme.nucleus > 0;
    const isLax = prevPhoneme.tense === false;
    if (!isAfterVowel || !isLax) return false;
  }

  // neverDouble
  if (config.neverDouble.includes(currPhoneme.sound)) return false;

  // finalDoublingOnly: at end of word, only these sounds may double
  if (isEndOfWord && config.finalDoublingOnly && config.finalDoublingOnly.length > 0) {
    if (!config.finalDoublingOnly.includes(currPhoneme.sound)) return false;
  }

  // suppressAfterReduction
  if (config.suppressAfterReduction && prevReduced) return false;

  // suppressBeforeTense
  if (config.suppressBeforeTense && nextNucleus) {
    if (nextNucleus.tense === true) return false;
  }

  // Calculate probability
  let prob = config.probability;

  // unstressedModifier
  if (config.unstressedModifier != null && !syllableStress) {
    prob *= config.unstressedModifier;
  }

  prob = Math.min(100, Math.max(0, Math.round(prob)));
  if (prob <= 0) return false;

  const shouldDouble = getWeightedOption([[true, prob], [false, 100 - prob]]);
  return shouldDouble;
}

// ---------------------------------------------------------------------------
// Grapheme selection
// ---------------------------------------------------------------------------

function chooseGrapheme(
  graphemeMaps: LanguageConfig["graphemeMaps"],
  cumulativeFrequencies: CumulativeFrequencyTable,
  currPhoneme: Phoneme,
  position: "onset" | "nucleus" | "coda",
  isCluster: boolean = false,
  isStartOfWord: boolean = false,
  isEndOfWord: boolean = false,
  prevPhoneme?: Phoneme,
  nextPhoneme?: Phoneme,
  doublingConfig?: DoublingConfig,
  syllableStress?: string,
  prevReduced?: boolean,
  nextNucleus?: Phoneme,
  doublingCtx?: DoublingContext,
  categories?: Map<string, Set<string>>,
  phonemeIndex?: number,
  totalPhonemes?: number,
): string {
  const graphemeList = graphemeMaps[position].get(currPhoneme.sound);
  const frequencyList = cumulativeFrequencies[position].get(currPhoneme.sound);
  if (!graphemeList || !frequencyList || graphemeList.length === 0) return '';

  // Filter by context condition
  let filteredList = graphemeList;
  let filteredFreqs = frequencyList;
  if (categories) {
    const conditioned = graphemeList.map((g, i) => ({ g, i })).filter(({ g }) =>
      meetsCondition(
        g.condition,
        prevPhoneme,
        nextPhoneme,
        isStartOfWord,
        isEndOfWord,
        totalPhonemes ?? 0,
        phonemeIndex ?? 0,
        categories,
      )
    );

    // Only use filtered list if it's non-empty; otherwise fall back to full list
    if (conditioned.length > 0 && conditioned.length < graphemeList.length) {
      filteredList = conditioned.map(c => c.g);
      // Rebuild cumulative frequencies for filtered list
      let cum = 0;
      filteredFreqs = filteredList.map(g => (cum += g.frequency, cum));
    }
  }

  const totalFrequency = filteredFreqs[filteredFreqs.length - 1];
  let randomValue = getRand()() * totalFrequency;

  let selectedGrapheme: Grapheme | undefined;
  for (let i = 0; i < filteredList.length; i++) {
    const grapheme = filteredList[i];
    if (
      (!isCluster || !grapheme.cluster || grapheme.cluster > 0) &&
      (!isStartOfWord || !grapheme.startWord || grapheme.startWord > 0) &&
      (!isEndOfWord || !grapheme.endWord || grapheme.endWord > 0) &&
      ((!isEndOfWord && !isStartOfWord) || grapheme.midWord > 0)
    ) {
      if (randomValue < filteredFreqs[i]) {
        selectedGrapheme = grapheme;
        break;
      }
    }
  }

  // Fallback to the first valid grapheme if none was selected
  if (!selectedGrapheme) {
    selectedGrapheme = filteredList.find(g =>
      (!isCluster || !g.cluster || g.cluster > 0) &&
      (!isStartOfWord || !g.startWord || g.startWord > 0) &&
      (!isEndOfWord || !g.endWord || g.endWord > 0) &&
      ((!isEndOfWord && !isStartOfWord) || g.midWord > 0)
    ) || filteredList[0];
  }

  let { form } = selectedGrapheme;

  // Apply doubling using config
  const ctx = doublingCtx ?? { doublingCount: 0 };
  if (shouldDoubleConsonant(
    doublingConfig,
    currPhoneme,
    prevPhoneme,
    nextNucleus,
    form,
    position,
    isCluster,
    isEndOfWord,
    syllableStress,
    prevReduced ?? false,
    ctx,
  )) {
    form += form;
    ctx.doublingCount++;
  }

  return form;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a `generateWrittenForm` function bound to the given language config's
 * grapheme maps. The cumulative frequency table is pre-computed once at creation.
 */
export function createWrittenFormGenerator(config: LanguageConfig): (context: WordGenerationContext) => void {
  const gMaps = config.graphemeMaps;
  const cumFreqs = buildCumulativeFrequencies(gMaps);
  const doublingConfig = config.doubling;
  const compiledRules = compileSpellingRules(config.spellingRules ?? []);
  const categories = buildCategorySets(config.phonemes);

  return (context: WordGenerationContext) => {
    const { syllables, written } = context.word;
    const flattenedPhonemes = syllables.flatMap((syllable, syllableIndex) =>
      (["onset", "nucleus", "coda"] as const).flatMap((position) =>
        syllable[position].map((phoneme) => ({
          phoneme,
          syllableIndex,
          position,
          stress: syllable.stress,
        }))
      )
    );

    const cleanParts: string[] = [];
    const hyphenatedParts: string[] = [];
    let currentSyllable: string[] = [];
    const doublingCtx: DoublingContext = { doublingCount: 0 };

    for (let phonemeIndex = 0; phonemeIndex < flattenedPhonemes.length; phonemeIndex++) {
      const { phoneme, syllableIndex, position, stress } = flattenedPhonemes[phonemeIndex];
      const prevEntry = flattenedPhonemes[phonemeIndex - 1];
      const nextEntry = flattenedPhonemes[phonemeIndex + 1];

      const isCluster =
        (prevEntry?.syllableIndex === syllableIndex && prevEntry?.position === position) ||
        (nextEntry?.syllableIndex === syllableIndex && nextEntry?.position === position);

      // Find the previous nucleus phoneme for reduction check
      const prevPhoneme = prevEntry?.phoneme;
      const prevReduced = prevPhoneme?.reduced ?? false;

      // Find the next nucleus phoneme for suppressBeforeTense
      let nextNucleus: Phoneme | undefined;
      for (let j = phonemeIndex + 1; j < flattenedPhonemes.length; j++) {
        if (flattenedPhonemes[j].position === "nucleus") {
          nextNucleus = flattenedPhonemes[j].phoneme;
          break;
        }
      }

      const grapheme = chooseGrapheme(
        gMaps,
        cumFreqs,
        phoneme,
        position,
        isCluster,
        phonemeIndex === 0,
        phonemeIndex === flattenedPhonemes.length - 1,
        prevPhoneme,
        nextEntry?.phoneme,
        doublingConfig,
        stress,
        prevReduced,
        nextNucleus,
        doublingCtx,
        categories,
        phonemeIndex,
        flattenedPhonemes.length,
      );

      if (currentSyllable.length > 0 && grapheme.length > 0 &&
          currentSyllable[currentSyllable.length - 1].slice(-1) === grapheme[0]) {
        currentSyllable.push(grapheme.slice(1));
      } else {
        currentSyllable.push(grapheme);
      }

      if (!nextEntry || nextEntry.syllableIndex !== syllableIndex) {
        let syllableStr = adjustSyllable(currentSyllable.join(''), compiledRules);

        if (cleanParts.length > 0 && syllableStr.length > 0 &&
            cleanParts[cleanParts.length - 1].slice(-1) === syllableStr[0]) {
          syllableStr = syllableStr.slice(1);
        }

        cleanParts.push(syllableStr);
        hyphenatedParts.push(syllableStr);

        if (nextEntry) {
          hyphenatedParts.push("&shy;");
        }

        currentSyllable = [];
      }
    }

    written.clean = cleanParts.join('');
    written.hyphenated = hyphenatedParts.join('');
  };
}
