import { Phoneme, Grapheme, GraphemeCondition, WordGenerationContext } from "../types.js";
import { LanguageConfig, DoublingConfig, SpellingRule } from "../config/language.js";
import { getRand } from '../utils/random.js';
import getWeightedOption from "../utils/getWeightedOption.js";

// ---------------------------------------------------------------------------
// Spelling rules (config-driven post-processing)
// ---------------------------------------------------------------------------

interface CompiledSpellingRule {
  name: string;
  regex: RegExp;
  replacement: string;
  probability: number;
  scope: "syllable" | "word" | "both";
}

function compileSpellingRules(rules: SpellingRule[]): CompiledSpellingRule[] {
  return rules.map(rule => ({
    name: rule.name,
    regex: new RegExp(rule.pattern, rule.flags ?? "g"),
    replacement: rule.replacement,
    probability: rule.probability ?? 100,
    scope: rule.scope ?? "both",
  }));
}

/**
 * Apply a list of compiled spelling rules to a string, handling probabilistic replacements.
 */
function applySpellingRules(str: string, rules: CompiledSpellingRule[]): string {
  let result = str;
  for (const { regex, replacement, probability } of rules) {
    regex.lastIndex = 0;
    if (probability >= 100) {
      result = result.replace(regex, replacement);
    } else {
      result = result.replace(regex, (match, ...args) => {
        if (getRand()() < probability / 100) {
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
      if (p.tense === false) categories.get("lax-vowel")!.add(p.sound);
      if (p.tense === true) categories.get("tense-vowel")!.add(p.sound);
      if (p.placeOfArticulation === "front") categories.get("front-vowel")!.add(p.sound);
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

// ---------------------------------------------------------------------------
// Pre-expanded conditions (Refactor 4)
// ---------------------------------------------------------------------------

interface PreExpandedCondition {
  leftContext?: Set<string>;
  rightContext?: Set<string>;
  notLeftContext?: Set<string>;
  notRightContext?: Set<string>;
  wordPosition?: ("initial" | "medial" | "final")[];
}

function preExpandConditions(
  graphemes: Grapheme[],
  categories: Map<string, Set<string>>,
): Map<Grapheme, PreExpandedCondition> {
  const result = new Map<Grapheme, PreExpandedCondition>();
  for (const g of graphemes) {
    if (!g.condition) continue;
    const expanded: PreExpandedCondition = {};
    if (g.condition.leftContext) expanded.leftContext = expandContext(g.condition.leftContext, categories);
    if (g.condition.rightContext) expanded.rightContext = expandContext(g.condition.rightContext, categories);
    if (g.condition.notLeftContext) expanded.notLeftContext = expandContext(g.condition.notLeftContext, categories);
    if (g.condition.notRightContext) expanded.notRightContext = expandContext(g.condition.notRightContext, categories);
    if (g.condition.wordPosition) expanded.wordPosition = g.condition.wordPosition;
    result.set(g, expanded);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Pipeline Step 1: Get candidates
// ---------------------------------------------------------------------------

function getGraphemeCandidates(
  graphemeMaps: LanguageConfig["graphemeMaps"],
  sound: string,
  position: "onset" | "nucleus" | "coda",
): Grapheme[] {
  return graphemeMaps[position].get(sound) ?? [];
}

// ---------------------------------------------------------------------------
// Pipeline Step 2: Filter by context condition
// ---------------------------------------------------------------------------

function meetsPreExpandedCondition(
  condition: PreExpandedCondition | undefined,
  prevPhoneme: Phoneme | undefined,
  nextPhoneme: Phoneme | undefined,
  isStartOfWord: boolean,
  isEndOfWord: boolean,
  totalPhonemes: number,
  phonemeIndex: number,
): boolean {
  if (!condition) return true;

  if (condition.wordPosition) {
    let positionMatch = false;
    const isInitial = isStartOfWord;
    const isFinal = isEndOfWord;
    const isMedial = !isInitial && !isFinal;

    for (const pos of condition.wordPosition) {
      if (pos === "initial" && isInitial) positionMatch = true;
      if (pos === "final" && isFinal) positionMatch = true;
      if (pos === "medial" && isMedial) positionMatch = true;
    }
    if (!positionMatch) return false;
  }

  if (condition.leftContext) {
    if (!prevPhoneme) return false;
    if (!condition.leftContext.has(prevPhoneme.sound)) return false;
  }

  if (condition.rightContext) {
    if (!nextPhoneme) return false;
    if (!condition.rightContext.has(nextPhoneme.sound)) return false;
  }

  if (condition.notLeftContext) {
    if (prevPhoneme && condition.notLeftContext.has(prevPhoneme.sound)) return false;
  }

  if (condition.notRightContext) {
    if (nextPhoneme && condition.notRightContext.has(nextPhoneme.sound)) return false;
  }

  return true;
}

function filterByCondition(
  candidates: Grapheme[],
  expandedConditions: Map<Grapheme, PreExpandedCondition>,
  prevPhoneme: Phoneme | undefined,
  nextPhoneme: Phoneme | undefined,
  phonemeIndex: number,
  totalPhonemes: number,
  isStartOfWord: boolean,
  isEndOfWord: boolean,
): Grapheme[] {
  const filtered = candidates.filter(g =>
    meetsPreExpandedCondition(
      expandedConditions.get(g),
      prevPhoneme,
      nextPhoneme,
      isStartOfWord,
      isEndOfWord,
      totalPhonemes,
      phonemeIndex,
    )
  );
  return filtered.length > 0 ? filtered : candidates;
}

// ---------------------------------------------------------------------------
// Pipeline Step 3: Filter by position
// ---------------------------------------------------------------------------

function filterByPosition(
  candidates: Grapheme[],
  isCluster: boolean,
  isStartOfWord: boolean,
  isEndOfWord: boolean,
): Grapheme[] {
  const filtered = candidates.filter(g =>
    (!isCluster || !g.cluster || g.cluster > 0) &&
    (!isStartOfWord || !g.startWord || g.startWord > 0) &&
    (!isEndOfWord || !g.endWord || g.endWord > 0) &&
    ((!isEndOfWord && !isStartOfWord) || g.midWord > 0)
  );
  return filtered.length > 0 ? filtered : candidates;
}

// ---------------------------------------------------------------------------
// Pipeline Step 4: Frequency-weighted random selection
// ---------------------------------------------------------------------------

function selectByFrequency(candidates: Grapheme[]): Grapheme {
  if (candidates.length === 0) return { phoneme: '', form: '', origin: 0, frequency: 0, startWord: 0, midWord: 0, endWord: 0 };
  if (candidates.length === 1) return candidates[0];

  let cumulative = 0;
  const cumulatives: number[] = [];
  for (const g of candidates) {
    cumulative += g.frequency;
    cumulatives.push(cumulative);
  }

  const totalFrequency = cumulatives[cumulatives.length - 1];
  const randomValue = getRand()() * totalFrequency;

  for (let i = 0; i < candidates.length; i++) {
    if (randomValue < cumulatives[i]) {
      return candidates[i];
    }
  }

  return candidates[candidates.length - 1];
}

// ---------------------------------------------------------------------------
// Pipeline Step 5: Apply doubling
// ---------------------------------------------------------------------------

interface DoublingContext {
  doublingCount: number;
}

function applyDoubling(
  form: string,
  config: DoublingConfig | undefined,
  doublingCtx: DoublingContext,
  currPhoneme: Phoneme,
  prevPhoneme: Phoneme | undefined,
  nextNucleus: Phoneme | undefined,
  position: "onset" | "nucleus" | "coda",
  isCluster: boolean,
  isEndOfWord: boolean,
  syllableStress: string | undefined,
  prevReduced: boolean,
  neverDoubleSet: Set<string>,
): string {
  if (!config || !config.enabled) return form;
  if (!prevPhoneme) return form;
  if (isCluster) return form;
  if (form.length !== 1) return form;
  if (position !== "onset" && position !== "coda") return form;
  if (doublingCtx.doublingCount >= config.maxPerWord) return form;

  // Check trigger
  if (config.trigger === "lax-vowel") {
    const isAfterVowel = prevPhoneme.nucleus != null && prevPhoneme.nucleus > 0;
    const isLax = prevPhoneme.tense === false;
    if (!isAfterVowel || !isLax) return form;
  }

  // neverDouble
  if (neverDoubleSet.has(currPhoneme.sound)) return form;

  // finalDoublingOnly
  if (isEndOfWord && config.finalDoublingOnly && config.finalDoublingOnly.length > 0) {
    if (!config.finalDoublingOnly.includes(currPhoneme.sound)) return form;
  }

  // suppressAfterReduction
  if (config.suppressAfterReduction && prevReduced) return form;

  // suppressBeforeTense
  if (config.suppressBeforeTense && nextNucleus) {
    if (nextNucleus.tense === true) return form;
  }

  // Calculate probability
  let prob = config.probability;
  if (config.unstressedModifier != null && !syllableStress) {
    prob *= config.unstressedModifier;
  }
  prob = Math.min(100, Math.max(0, Math.round(prob)));
  if (prob <= 0) return form;

  const shouldDouble = getWeightedOption([[true, prob], [false, 100 - prob]]);
  if (shouldDouble) {
    doublingCtx.doublingCount++;
    return form + form;
  }
  return form;
}

// ---------------------------------------------------------------------------
// Consonant pileup repair
// ---------------------------------------------------------------------------

const VOWEL_LETTERS = new Set(['a', 'e', 'i', 'o', 'u', 'y']);

function isConsonantLetter(ch: string): boolean {
  return !VOWEL_LETTERS.has(ch.toLowerCase());
}

/**
 * Repair consonant pileups by capping consecutive consonant letters at `max`.
 * Mutates `cleanParts` and `hyphenatedParts` in place.
 *
 * Strategy: when a consonant run exceeds `max`, find the syllable boundary
 * within the run, determine which side (coda vs onset) contributes more
 * consonant letters, and remove interior consonant letters from the heavier
 * side until the run fits within the limit.
 */
export function repairConsonantPileups(
  cleanParts: string[],
  hyphenatedParts: string[],
  maxConsonantLetters: number,
): void {
  // We may need multiple passes since removing letters can merge runs
  for (let pass = 0; pass < 10; pass++) {
    const word = cleanParts.join('');
    // Find first consonant run exceeding max
    let runStart = -1;
    let runLen = 0;
    let found = false;
    let foundStart = -1;
    let foundLen = 0;

    for (let i = 0; i <= word.length; i++) {
      if (i < word.length && isConsonantLetter(word[i])) {
        if (runStart < 0) runStart = i;
        runLen = i - runStart + 1;
      } else {
        if (runLen > maxConsonantLetters) {
          found = true;
          foundStart = runStart;
          foundLen = runLen;
          break;
        }
        runStart = -1;
        runLen = 0;
      }
    }

    if (!found) return; // All good

    // Map character indices to parts
    const cumLengths: number[] = [];
    let cum = 0;
    for (const part of cleanParts) {
      cum += part.length;
      cumLengths.push(cum);
    }

    // Find the syllable boundary within the run
    // The boundary is between two parts where the run spans
    const runEnd = foundStart + foundLen - 1;

    // Find which part each char of the run belongs to
    function partIndexOf(charIdx: number): number {
      for (let p = 0; p < cumLengths.length; p++) {
        if (charIdx < cumLengths[p]) return p;
      }
      return cumLengths.length - 1;
    }

    const startPart = partIndexOf(foundStart);
    const endPart = partIndexOf(runEnd);

    // If run spans a boundary, find the boundary point
    // Count consonant letters on the coda side (startPart) vs onset side (endPart)
    if (startPart === endPart) {
      // Run is within a single syllable — just trim interior letters
      const partStart = startPart > 0 ? cumLengths[startPart - 1] : 0;
      const localStart = foundStart - partStart;
      const localEnd = localStart + foundLen;
      const part = cleanParts[startPart];
      const excess = foundLen - maxConsonantLetters;

      // Remove interior consonant letters (not first or last of the run)
      const runInPart = part.slice(localStart, localEnd);
      let trimmed = runInPart[0];
      const interior = runInPart.slice(1, -1);
      let removed = 0;
      // Remove from the middle outward
      const keep = new Array(interior.length).fill(true);
      for (let i = Math.floor(interior.length / 2); removed < excess && i < interior.length; i++) {
        if (isConsonantLetter(interior[i])) { keep[i] = false; removed++; }
      }
      for (let i = Math.floor(interior.length / 2) - 1; removed < excess && i >= 0; i--) {
        if (isConsonantLetter(interior[i])) { keep[i] = false; removed++; }
      }
      for (let i = 0; i < interior.length; i++) {
        if (keep[i]) trimmed += interior[i];
      }
      trimmed += runInPart[runInPart.length - 1];

      cleanParts[startPart] = part.slice(0, localStart) + trimmed + part.slice(localEnd);
      hyphenatedParts[startPart * 2] = cleanParts[startPart];
      continue;
    }

    // Run spans boundary between startPart and endPart
    // Count coda consonants (in startPart) and onset consonants (in endPart)
    const boundaryCharIdx = cumLengths[startPart]; // first char of endPart
    const codaConsonants = boundaryCharIdx - foundStart;
    const onsetConsonants = foundLen - codaConsonants;
    const excess = foundLen - maxConsonantLetters;

    // Drop from whichever side contributes more; tie → coda
    const dropFromCoda = codaConsonants >= onsetConsonants;
    const targetPartIdx = dropFromCoda ? startPart : endPart;
    const part = cleanParts[targetPartIdx];
    const partStartChar = targetPartIdx > 0 ? cumLengths[targetPartIdx - 1] : 0;

    // Find the consonant run within this part (at the end for coda, start for onset)
    let localConsonants: { idx: number; ch: string }[] = [];
    if (dropFromCoda) {
      // Consonants at end of part
      for (let i = part.length - 1; i >= 0 && isConsonantLetter(part[i]); i--) {
        localConsonants.unshift({ idx: i, ch: part[i] });
      }
    } else {
      // Consonants at start of part
      for (let i = 0; i < part.length && isConsonantLetter(part[i]); i++) {
        localConsonants.push({ idx: i, ch: part[i] });
      }
    }

    // Remove interior consonants (not first/last of the local run)
    // Prefer digraph-like positions (just remove from interior)
    const toRemove = new Set<number>();
    if (localConsonants.length > 2) {
      const interior = localConsonants.slice(1, -1);
      // Sort by distance from center (middle first)
      const mid = (interior.length - 1) / 2;
      interior.sort((a, b) => Math.abs(interior.indexOf(a) - mid) - Math.abs(interior.indexOf(b) - mid));
      for (const c of interior) {
        if (toRemove.size >= excess) break;
        toRemove.add(c.idx);
      }
    }
    // If we still need more, remove edge consonants (but preserve at least one)
    if (toRemove.size < excess && localConsonants.length > 1) {
      // Remove from interior side of edges
      if (dropFromCoda && toRemove.size < excess) {
        // Remove first of the coda run (least important edge)
        for (const c of localConsonants) {
          if (toRemove.size >= excess) break;
          if (!toRemove.has(c.idx)) { toRemove.add(c.idx); }
        }
      } else {
        // Remove last of the onset run
        for (let i = localConsonants.length - 1; i >= 0 && toRemove.size < excess; i--) {
          if (!toRemove.has(localConsonants[i].idx)) { toRemove.add(localConsonants[i].idx); }
        }
      }
    }

    let newPart = '';
    for (let i = 0; i < part.length; i++) {
      if (!toRemove.has(i)) newPart += part[i];
    }

    cleanParts[targetPartIdx] = newPart;
    hyphenatedParts[targetPartIdx * 2] = newPart;
  }
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
  const doublingConfig = config.doubling;
  const allCompiledRules = compileSpellingRules(config.spellingRules ?? []);
  const syllableRules = allCompiledRules.filter(r => r.scope === "syllable" || r.scope === "both");
  const wordRules = allCompiledRules.filter(r => r.scope === "word" || r.scope === "both");
  const categories = buildCategorySets(config.phonemes);
  const neverDoubleSet = new Set<string>(doublingConfig?.neverDouble ?? []);

  // Pre-expand conditions for all graphemes
  const expandedConditions = preExpandConditions(config.graphemes, categories);

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

      const prevPhoneme = prevEntry?.phoneme;
      const prevReduced = prevPhoneme?.reduced ?? false;

      let nextNucleus: Phoneme | undefined;
      for (let j = phonemeIndex + 1; j < flattenedPhonemes.length; j++) {
        if (flattenedPhonemes[j].position === "nucleus") {
          nextNucleus = flattenedPhonemes[j].phoneme;
          break;
        }
      }

      const isStartOfWord = phonemeIndex === 0;
      const isEndOfWord = phonemeIndex === flattenedPhonemes.length - 1;

      // Pipeline
      const candidates = getGraphemeCandidates(gMaps, phoneme.sound, position);
      const conditioned = filterByCondition(candidates, expandedConditions, prevPhoneme, nextEntry?.phoneme, phonemeIndex, flattenedPhonemes.length, isStartOfWord, isEndOfWord);
      const positional = filterByPosition(conditioned, isCluster, isStartOfWord, isEndOfWord);
      const selected = selectByFrequency(positional);
      const form = applyDoubling(selected.form, doublingConfig, doublingCtx, phoneme, prevPhoneme, nextNucleus, position, isCluster, isEndOfWord, stress, prevReduced, neverDoubleSet);

      if (currentSyllable.length > 0 && form.length > 0 &&
          currentSyllable[currentSyllable.length - 1].slice(-1) === form[0]) {
        currentSyllable.push(form.slice(1));
      } else {
        currentSyllable.push(form);
      }

      if (!nextEntry || nextEntry.syllableIndex !== syllableIndex) {
        let syllableStr = applySpellingRules(currentSyllable.join(''), syllableRules);

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

    // Hard-g fix: if a syllable ends with 'g' (from /g/ in coda) and the
    // next syllable's written form starts with e, i, or y, insert silent 'u'
    // to prevent the 'g' from being read as soft-g (/dʒ/).
    for (let si = 0; si < cleanParts.length - 1; si++) {
      const part = cleanParts[si];
      const nextPart = cleanParts[si + 1];
      if (part.length > 0 && nextPart.length > 0 &&
          part[part.length - 1] === 'g' &&
          syllables[si].coda.length > 0 &&
          syllables[si].coda[syllables[si].coda.length - 1].sound === 'g' &&
          /^[eiy]/i.test(nextPart)) {
        cleanParts[si] = part + 'u';
        // hyphenatedParts interleaves syllable strings (even indices) with
        // "&shy;" separators (odd indices), so syllable `si` maps to index `si * 2`.
        hyphenatedParts[si * 2] = hyphenatedParts[si * 2] + 'u';
      }
    }

    // Consonant pileup repair
    if (config.writtenFormConstraints?.maxConsonantLetters) {
      repairConsonantPileups(cleanParts, hyphenatedParts, config.writtenFormConstraints.maxConsonantLetters);
    }

    // Post-join pass: apply word-scope spelling rules
    written.clean = applySpellingRules(cleanParts.join(''), wordRules);
    written.hyphenated = hyphenatedParts.join('');
  };
}
