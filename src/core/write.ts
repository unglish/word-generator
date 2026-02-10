import { Phoneme, Grapheme, GraphemeCondition, WordGenerationContext } from "../types.js";
import { LanguageConfig, DoublingConfig, SpellingRule } from "../config/language.js";
import type { RNG } from '../utils/random.js';
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
function applySpellingRules(str: string, rules: CompiledSpellingRule[], rand: RNG): string {
  let result = str;
  for (const { regex, replacement, probability } of rules) {
    regex.lastIndex = 0;
    if (probability >= 100) {
      result = result.replace(regex, replacement);
    } else {
      result = result.replace(regex, (match, ...args) => {
        if (rand() < probability / 100) {
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

function selectByFrequency(candidates: Grapheme[], rand: RNG): Grapheme {
  if (candidates.length === 0) return { phoneme: '', form: '', origin: 0, frequency: 0, startWord: 0, midWord: 0, endWord: 0 };
  if (candidates.length === 1) return candidates[0];

  let cumulative = 0;
  const cumulatives: number[] = [];
  for (const g of candidates) {
    cumulative += g.frequency;
    cumulatives.push(cumulative);
  }

  const totalFrequency = cumulatives[cumulatives.length - 1];
  const randomValue = rand() * totalFrequency;

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
  rand: RNG,
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

  const shouldDouble = getWeightedOption([[true, prob], [false, 100 - prob]], rand);
  if (shouldDouble) {
    doublingCtx.doublingCount++;
    return form + form;
  }
  return form;
}

// ---------------------------------------------------------------------------
// Consonant pileup repair (grapheme-aware)
// ---------------------------------------------------------------------------

const VOWEL_LETTERS = new Set(['a', 'e', 'i', 'o', 'u', 'y']);

function isConsonantLetter(ch: string): boolean {
  return !VOWEL_LETTERS.has(ch.toLowerCase());
}

/** Default English consonant graphemes (longest first for greedy matching). */
const DEFAULT_CONSONANT_GRAPHEMES = ["tch", "dge", "ch", "sh", "th", "ng", "ph", "wh", "ck"];

/**
 * Tokenize a string into grapheme units using longest-match-first.
 * Multi-letter consonant graphemes (e.g. "tch", "ch", "sh") are treated as
 * atomic units. Remaining characters become single-letter tokens.
 *
 * @example tokenizeGraphemes("tchwng") → ["tch", "w", "ng"]
 * @example tokenizeGraphemes("strengths") → ["s", "t", "r", "e", "ng", "th", "s"]
 */
export function tokenizeGraphemes(str: string, graphemeList: string[] = DEFAULT_CONSONANT_GRAPHEMES): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < str.length) {
    let matched = false;
    // Try longest graphemes first (list is pre-sorted longest first)
    for (const g of graphemeList) {
      if (str.startsWith(g, i)) {
        tokens.push(g);
        i += g.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      tokens.push(str[i]);
      i++;
    }
  }
  return tokens;
}

/** Check if a grapheme token is a consonant (contains no vowel letters). */
function isConsonantToken(token: string): boolean {
  for (const ch of token) {
    if (VOWEL_LETTERS.has(ch.toLowerCase())) return false;
  }
  return true;
}

/**
 * Repair consonant pileups by capping consecutive consonant grapheme units at `max`.
 * Mutates `cleanParts` and `hyphenatedParts` in place.
 *
 * Strategy: when a consonant run exceeds `max` grapheme units, find the
 * syllable boundary within the run, determine which side (coda vs onset)
 * contributes more, and drop entire grapheme tokens from the heavier side
 * (interior-first) until the run fits.
 */
export function repairConsonantPileups(
  cleanParts: string[],
  hyphenatedParts: string[],
  maxConsonantGraphemes: number,
  consonantGraphemes?: string[],
): void {
  const gList = consonantGraphemes ?? DEFAULT_CONSONANT_GRAPHEMES;

  for (let pass = 0; pass < 10; pass++) {
    const word = cleanParts.join('');
    const tokens = tokenizeGraphemes(word, gList);

    // Find first consonant run exceeding max (in tokens)
    let runStart = -1;
    let runLen = 0;
    let found = false;
    let foundRunStart = -1;
    let foundRunLen = 0;

    for (let i = 0; i <= tokens.length; i++) {
      if (i < tokens.length && isConsonantToken(tokens[i])) {
        if (runStart < 0) runStart = i;
        runLen = i - runStart + 1;
      } else {
        if (runLen > maxConsonantGraphemes) {
          found = true;
          foundRunStart = runStart;
          foundRunLen = runLen;
          break;
        }
        runStart = -1;
        runLen = 0;
      }
    }

    if (!found) return;

    // Convert token indices to character positions
    const tokenCharStarts: number[] = [];
    let charPos = 0;
    for (const t of tokens) {
      tokenCharStarts.push(charPos);
      charPos += t.length;
    }

    const runCharStart = tokenCharStarts[foundRunStart];
    const runCharEnd = foundRunStart + foundRunLen < tokens.length
      ? tokenCharStarts[foundRunStart + foundRunLen]
      : word.length;

    // Map character positions to parts
    const cumLengths: number[] = [];
    let cum = 0;
    for (const part of cleanParts) {
      cum += part.length;
      cumLengths.push(cum);
    }

    function partIndexOf(charIdx: number): number {
      for (let p = 0; p < cumLengths.length; p++) {
        if (charIdx < cumLengths[p]) return p;
      }
      return cumLengths.length - 1;
    }

    const startPart = partIndexOf(runCharStart);
    const endPart = partIndexOf(runCharEnd - 1);
    const excess = foundRunLen - maxConsonantGraphemes;

    if (startPart === endPart) {
      // Run within a single syllable — drop interior tokens
      const partCharStart = startPart > 0 ? cumLengths[startPart - 1] : 0;
      const runTokens = tokens.slice(foundRunStart, foundRunStart + foundRunLen);

      // Remove interior tokens (not first/last), middle-outward
      const interior = runTokens.slice(1, -1);
      const midIdx = Math.floor(interior.length / 2);
      const removeOrder: number[] = [];
      for (let d = 0; d <= interior.length; d++) {
        if (midIdx + d < interior.length) removeOrder.push(midIdx + d);
        if (d > 0 && midIdx - d >= 0) removeOrder.push(midIdx - d);
      }

      const toRemoveSet = new Set<number>();
      for (const idx of removeOrder) {
        if (toRemoveSet.size >= excess) break;
        toRemoveSet.add(idx);
      }

      const kept = [runTokens[0]];
      for (let i = 0; i < interior.length; i++) {
        if (!toRemoveSet.has(i)) kept.push(interior[i]);
      }
      kept.push(runTokens[runTokens.length - 1]);

      const localStart = runCharStart - partCharStart;
      const localEnd = runCharEnd - partCharStart;
      const part = cleanParts[startPart];
      cleanParts[startPart] = part.slice(0, localStart) + kept.join('') + part.slice(localEnd);
      hyphenatedParts[startPart * 2] = cleanParts[startPart];
      continue;
    }

    // Run spans boundary — count coda vs onset tokens
    const boundaryCharIdx = cumLengths[startPart];
    // Count tokens belonging to coda (chars < boundaryCharIdx)
    let codaTokenCount = 0;
    for (let ti = foundRunStart; ti < foundRunStart + foundRunLen; ti++) {
      if (tokenCharStarts[ti] < boundaryCharIdx) codaTokenCount++;
      else break;
    }
    const onsetTokenCount = foundRunLen - codaTokenCount;

    // Drop from heavier side; tie → coda
    const dropFromCoda = codaTokenCount >= onsetTokenCount;
    const targetPartIdx = dropFromCoda ? startPart : endPart;
    const part = cleanParts[targetPartIdx];
    const partCharStartPos = targetPartIdx > 0 ? cumLengths[targetPartIdx - 1] : 0;

    // Tokenize just this part
    const partTokens = tokenizeGraphemes(part, gList);

    // Find the consonant tokens at the relevant edge
    let edgeTokens: { tokenIdx: number; token: string }[] = [];
    if (dropFromCoda) {
      // Consonant tokens at end of part
      for (let i = partTokens.length - 1; i >= 0 && isConsonantToken(partTokens[i]); i--) {
        edgeTokens.unshift({ tokenIdx: i, token: partTokens[i] });
      }
    } else {
      // Consonant tokens at start of part
      for (let i = 0; i < partTokens.length && isConsonantToken(partTokens[i]); i++) {
        edgeTokens.push({ tokenIdx: i, token: partTokens[i] });
      }
    }

    // Remove interior tokens first, then edges
    const toRemoveIndices = new Set<number>();
    if (edgeTokens.length > 2) {
      const interior = edgeTokens.slice(1, -1);
      const mid = Math.floor(interior.length / 2);
      const order: typeof interior = [];
      for (let d = 0; d <= interior.length; d++) {
        if (mid + d < interior.length) order.push(interior[mid + d]);
        if (d > 0 && mid - d >= 0) order.push(interior[mid - d]);
      }
      for (const e of order) {
        if (toRemoveIndices.size >= excess) break;
        toRemoveIndices.add(e.tokenIdx);
      }
    }
    // If still need more, remove from edges
    if (toRemoveIndices.size < excess) {
      const candidates = dropFromCoda ? edgeTokens : [...edgeTokens].reverse();
      for (const e of candidates) {
        if (toRemoveIndices.size >= excess) break;
        if (!toRemoveIndices.has(e.tokenIdx)) toRemoveIndices.add(e.tokenIdx);
      }
    }

    const newPart = partTokens.filter((_, i) => !toRemoveIndices.has(i)).join('');
    cleanParts[targetPartIdx] = newPart;
    hyphenatedParts[targetPartIdx * 2] = newPart;
  }
}

// ---------------------------------------------------------------------------
// Articulatory helpers for feature-based junction validation
// ---------------------------------------------------------------------------

export function mannerGroup(p: Phoneme): string {
  const m = p.mannerOfArticulation;
  if (m === 'sibilant') return 'fricative';
  if (m === 'lateralApproximant') return 'liquid';
  return m;
}

export function isCoronal(p: Phoneme): boolean {
  const place = p.placeOfArticulation;
  return place === 'alveolar' || place === 'postalveolar' || place === 'dental';
}

export function placeGroup(p: Phoneme): string {
  const place = p.placeOfArticulation;
  if (place === 'bilabial' || place === 'labiodental' || place === 'labial-velar') return 'labial';
  if (place === 'dental' || place === 'alveolar' || place === 'postalveolar') return 'coronal';
  if (place === 'palatal' || place === 'velar') return 'dorsal';
  return place; // glottal etc.
}

// ---------------------------------------------------------------------------
// Syllable boundary type for junction validation
// ---------------------------------------------------------------------------

export interface SyllableBoundary {
  codaFinal: Phoneme | undefined;
  onsetInitial: Phoneme | undefined;
  onsetCluster: Phoneme[];
}

// ---------------------------------------------------------------------------
// Feature-based junction validation
// ---------------------------------------------------------------------------

export function isJunctionValid(C1: Phoneme, C2: Phoneme, onsetCluster: Phoneme[]): boolean {
  // F1: identical phonemes
  if (C1.sound === C2.sound) return false;

  // F2: same mannerGroup AND same exact place of articulation
  if (mannerGroup(C1) === mannerGroup(C2) && C1.placeOfArticulation === C2.placeOfArticulation) return false;

  // F3: stop+stop where neither is coronal
  // (blocks b.k, p.k, g.k, k.b, k.p, k.g — dorsal+labial stops in any direction)
  // F3 also blocks affricate+stop where neither side is coronal — but all English affricates are coronal, so this is moot
  if (mannerGroup(C1) === 'stop' && mannerGroup(C2) === 'stop' && !isCoronal(C1) && !isCoronal(C2)) return false;

  // F4: stop+stop voicing disagreement (blocks d.k, b.t, g.p etc.)
  if (mannerGroup(C1) === 'stop' && mannerGroup(C2) === 'stop' && C1.voiced !== C2.voiced) return false;

  // P1: s-exception
  if (C1.sound === 's') return true;
  if (C2.sound === 's' && onsetCluster.length >= 2 && ['t','p','k'].includes(onsetCluster[1]?.sound)) return true;
  if (onsetCluster.length >= 2 && onsetCluster[0].sound === 's' && ['t','p','k'].includes(onsetCluster[1].sound)) return true;

  // P2: coronal onset
  if (isCoronal(C2)) return true;

  // P3: homorganic nasal+stop
  if (mannerGroup(C1) === 'nasal' && mannerGroup(C2) === 'stop' && placeGroup(C1) === placeGroup(C2)) return true;

  // P4: manner change
  if (mannerGroup(C1) !== mannerGroup(C2)) return true;

  // P5: place change
  if (placeGroup(C1) !== placeGroup(C2)) return true;

  return false; // default fail
}

/**
 * Repair coda→onset junctions using feature-based articulatory rules.
 * Drops grapheme tokens from the coda side when the junction is invalid.
 * Mutates `cleanParts` and `hyphenatedParts` in place.
 */
export function repairJunctions(
  cleanParts: string[],
  hyphenatedParts: string[],
  boundaries: SyllableBoundary[],
  consonantGraphemes?: string[],
): void {
  const gList = consonantGraphemes ?? DEFAULT_CONSONANT_GRAPHEMES;

  const repaired = new Set<number>();
  for (let pass = 0; pass < 10; pass++) {
    let changed = false;
    for (let i = 0; i < boundaries.length; i++) {
      if (repaired.has(i)) continue;
      const { codaFinal, onsetInitial, onsetCluster } = boundaries[i];
      if (!codaFinal || !onsetInitial) continue;

      if (!isJunctionValid(codaFinal, onsetInitial, onsetCluster)) {
        // Drop the last consonant grapheme token from the coda part
        const codaPart = cleanParts[i];
        if (!codaPart) continue;

        const codaTokens = tokenizeGraphemes(codaPart, gList);
        let lastCodaConsonantIdx = -1;
        for (let j = codaTokens.length - 1; j >= 0; j--) {
          if (isConsonantToken(codaTokens[j])) { lastCodaConsonantIdx = j; break; }
        }
        if (lastCodaConsonantIdx < 0) continue;

        codaTokens.splice(lastCodaConsonantIdx, 1);
        cleanParts[i] = codaTokens.join('');
        hyphenatedParts[i * 2] = cleanParts[i];
        repaired.add(i);
        changed = true;
      }
    }
    if (!changed) return;
  }
}

// ---------------------------------------------------------------------------
// Raw consonant letter repair (backstop)
// ---------------------------------------------------------------------------

/**
 * Repair consonant pileups by counting raw consonant *letters* (not grapheme units).
 * Mutates `cleanParts` and `hyphenatedParts` in place.
 */
export function repairConsonantLetters(
  cleanParts: string[],
  hyphenatedParts: string[],
  maxLetters: number,
): void {
  for (let pass = 0; pass < 10; pass++) {
    const word = cleanParts.join('');

    // Find first run of consonant letters exceeding max
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
        if (runLen > maxLetters) {
          found = true;
          foundStart = runStart;
          foundLen = runLen;
          break;
        }
        runStart = -1;
        runLen = 0;
      }
    }

    if (!found) return;

    // Map char positions to parts
    const cumLengths: number[] = [];
    let cum = 0;
    for (const part of cleanParts) {
      cum += part.length;
      cumLengths.push(cum);
    }

    function partIndexOf(charIdx: number): number {
      for (let p = 0; p < cumLengths.length; p++) {
        if (charIdx < cumLengths[p]) return p;
      }
      return cumLengths.length - 1;
    }

    const startPart = partIndexOf(foundStart);
    const endPart = partIndexOf(foundStart + foundLen - 1);

    // Drop from the heavier side at the boundary
    const boundaryCharIdx = startPart < endPart ? cumLengths[startPart] : -1;

    let dropPartIdx: number;
    if (boundaryCharIdx < 0) {
      dropPartIdx = startPart;
    } else {
      const codaCount = boundaryCharIdx - foundStart;
      const onsetCount = foundLen - codaCount;
      dropPartIdx = codaCount >= onsetCount ? startPart : endPart;
    }

    const part = cleanParts[dropPartIdx];
    const partStart = dropPartIdx > 0 ? cumLengths[dropPartIdx - 1] : 0;

    // Find consonant letters in this part that are within the run
    const consonantIndices: number[] = [];
    for (let ci = 0; ci < part.length; ci++) {
      const globalIdx = partStart + ci;
      if (globalIdx >= foundStart && globalIdx < foundStart + foundLen && isConsonantLetter(part[ci])) {
        consonantIndices.push(ci);
      }
    }

    if (consonantIndices.length <= 1) return; // can't drop

    // Drop interior consonant (middle-outward)
    const interior = consonantIndices.slice(1, -1);
    const dropIdx = interior.length > 0
      ? interior[Math.floor(interior.length / 2)]
      : consonantIndices[Math.floor(consonantIndices.length / 2)];

    cleanParts[dropPartIdx] = part.slice(0, dropIdx) + part.slice(dropIdx + 1);
    hyphenatedParts[dropPartIdx * 2] = cleanParts[dropPartIdx];
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
    const rand = context.rand;
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
      const selected = selectByFrequency(positional, rand);
      const form = applyDoubling(selected.form, doublingConfig, doublingCtx, phoneme, prevPhoneme, nextNucleus, position, isCluster, isEndOfWord, stress, prevReduced, neverDoubleSet, rand);

      if (currentSyllable.length > 0 && form.length > 0 &&
          currentSyllable[currentSyllable.length - 1].slice(-1) === form[0]) {
        currentSyllable.push(form.slice(1));
      } else {
        currentSyllable.push(form);
      }

      if (!nextEntry || nextEntry.syllableIndex !== syllableIndex) {
        let syllableStr = applySpellingRules(currentSyllable.join(''), syllableRules, rand);

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

    // Consonant pileup repair (grapheme-aware)
    const wfc = config.writtenFormConstraints;
    const maxGraphemes = wfc?.maxConsonantGraphemes;
    if (maxGraphemes) {
      repairConsonantPileups(cleanParts, hyphenatedParts, maxGraphemes, wfc?.consonantGraphemes);
    }

    // Feature-based junction validation
    if (syllables.length > 1) {
      const boundaries: SyllableBoundary[] = [];
      for (let si = 0; si < syllables.length - 1; si++) {
        const coda = syllables[si].coda;
        const nextOnset = syllables[si + 1].onset;
        boundaries.push({
          codaFinal: coda.length > 0 ? coda[coda.length - 1] : undefined,
          onsetInitial: nextOnset.length > 0 ? nextOnset[0] : undefined,
          onsetCluster: nextOnset,
        });
      }
      repairJunctions(cleanParts, hyphenatedParts, boundaries, wfc?.consonantGraphemes);
      // Re-run pileup repair in case junction repair changed things
      if (maxGraphemes) {
        repairConsonantPileups(cleanParts, hyphenatedParts, maxGraphemes, wfc?.consonantGraphemes);
      }
    }

    // Raw consonant letter backstop
    if (wfc?.maxConsonantLetters) {
      repairConsonantLetters(cleanParts, hyphenatedParts, wfc.maxConsonantLetters);
    }

    // Post-join pass: apply word-scope spelling rules
    let finalClean = applySpellingRules(cleanParts.join(''), wordRules, rand);

    // Re-run consonant backstop after spelling rules (rules like ngx→nks can introduce new runs)
    if (wfc?.maxConsonantGraphemes || wfc?.maxConsonantLetters) {
      const postParts = [finalClean];
      const postHyph = [finalClean];
      if (wfc.maxConsonantGraphemes) {
        repairConsonantPileups(postParts, postHyph, wfc.maxConsonantGraphemes, wfc.consonantGraphemes);
      }
      if (wfc.maxConsonantLetters) {
        repairConsonantLetters(postParts, postHyph, wfc.maxConsonantLetters);
      }
      finalClean = postParts[0];
    }

    written.clean = finalClean;
    written.hyphenated = hyphenatedParts.join('');
  };
}
