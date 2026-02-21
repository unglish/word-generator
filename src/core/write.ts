import { Phoneme, Grapheme, WordGenerationContext } from "../types.js";
import { LanguageConfig, DoublingConfig, SpellingRule, SilentEConfig, SilentEAppendRule, sonorityClass } from "../config/language.js";
import type { RNG } from "../utils/random.js";
import type { TraceCollector } from "./trace.js";
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
function applySpellingRules(str: string, rules: CompiledSpellingRule[], rand: RNG, trace?: TraceCollector, scope?: string): string {
  let result = str;
  for (const { name, regex, replacement, probability } of rules) {
    regex.lastIndex = 0;
    const before = trace ? result : "";
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
    if (trace && result !== before) {
      trace.recordRepair(`spellingRule:${name}`, before, result, scope);
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
  categories.set("back-vowel", new Set());
  categories.set("c-soft-vowel", new Set());
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
      // (Triphthongs removed — /aɪə/ decomposed into diphthong + /ə/.)
      if (p.placeOfArticulation === "back") categories.get("back-vowel")!.add(p.sound);
      // Vowels that cause c-softening: front vowels that typically write as e/i/y.
      // Schwa excluded: it often writes as a/o/u where c should be hard (canal, collect).
      const cSoftSounds = new Set(["i:", "ɪ", "ɛ", "eɪ", "aɪ", "ɜ", "ɚ"]);
      if (cSoftSounds.has(p.sound)) categories.get("c-soft-vowel")!.add(p.sound);
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
  leftGraphemeContext?: Set<string>;
  notLeftGraphemeContext?: Set<string>;
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
    if (g.condition.leftGraphemeContext) expanded.leftGraphemeContext = new Set(g.condition.leftGraphemeContext);
    if (g.condition.notLeftGraphemeContext) expanded.notLeftGraphemeContext = new Set(g.condition.notLeftGraphemeContext);
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
  prevGraphemeForm?: string,
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

  if (condition.leftGraphemeContext) {
    if (!prevGraphemeForm) return false;
    const lastLetter = prevGraphemeForm[prevGraphemeForm.length - 1];
    if (!condition.leftGraphemeContext.has(lastLetter)) return false;
  }

  if (condition.notLeftGraphemeContext) {
    if (prevGraphemeForm) {
      const lastLetter = prevGraphemeForm[prevGraphemeForm.length - 1];
      if (condition.notLeftGraphemeContext.has(lastLetter)) return false;
    }
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
  prevGraphemeForm?: string,
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
      prevGraphemeForm,
    )
  );
  return filtered.length > 0 ? filtered : candidates;
}

// ---------------------------------------------------------------------------
// Pipeline Step 3: Filter by position
// ---------------------------------------------------------------------------

export function filterByPosition(
  candidates: Grapheme[],
  isCluster: boolean,
  isStartOfWord: boolean,
  isEndOfWord: boolean,
): Grapheme[] {
  const isMidWord = !isStartOfWord && !isEndOfWord;

  // Tier 1: strict — require positive values (undefined = pass)
  const strict = candidates.filter(g =>
    (!isCluster || g.cluster === undefined || g.cluster > 0) &&
    (!isStartOfWord || g.startWord === undefined || g.startWord > 0) &&
    (!isEndOfWord || g.endWord === undefined || g.endWord > 0) &&
    (!isMidWord || g.midWord === undefined || g.midWord > 0)
  );
  if (strict.length > 0) return strict;

  // Tier 2: relaxed — only exclude explicit bans (=== 0)
  const relaxed = candidates.filter(g =>
    (!isCluster || g.cluster !== 0) &&
    (!isStartOfWord || g.startWord !== 0) &&
    (!isEndOfWord || g.endWord !== 0) &&
    (!isMidWord || g.midWord !== 0)
  );
  if (relaxed.length > 0) return relaxed;

  // Tier 3: last resort (should never happen with well-configured graphemes)
  return candidates;
}

// ---------------------------------------------------------------------------
// Pipeline Step 4: Frequency-weighted random selection
// ---------------------------------------------------------------------------

interface FrequencyResult extends Grapheme {
  _weights?: [string, number][];
  _roll?: number;
}

function selectByFrequency(
  candidates: Grapheme[],
  rand: RNG,
  isStartOfWord: boolean,
  isEndOfWord: boolean,
  captureTrace: boolean = false,
  position?: "onset" | "nucleus" | "coda",
  stress?: string,
  syllableCount?: number,
): FrequencyResult {
  if (candidates.length === 0) return { phoneme: "", form: "", origin: 0, frequency: 0, startWord: 0, midWord: 0, endWord: 0 };
  if (candidates.length === 1) {
    const r: FrequencyResult = { ...candidates[0] };
    if (captureTrace) { r._weights = [[candidates[0].form, 1]]; r._roll = 0; }
    return r;
  }

  const weights: [string, number][] = [];
  let cumulative = 0;
  const cumulatives: number[] = [];
  for (const g of candidates) {
    // For monosyllables (both isStartOfWord AND isEndOfWord), use the maximum position weight
    // to avoid defaulting to startWord=0 for final phonemes (e.g. /dz/ → "dse")
    const posWeight = (isStartOfWord && isEndOfWord)
      ? Math.max(g.startWord ?? 1, g.endWord ?? 1, g.midWord ?? 1)
      : isStartOfWord
        ? (g.startWord ?? 1)
        : isEndOfWord
          ? (g.endWord ?? 1)
          : (g.midWord ?? 1);
    // In unstressed syllables of polysyllabic words, penalize multi-letter
    // vowel graphemes. CMU data shows vowel LPP drops from 1.58 (1-syl) to
    // 1.02 (5-syl) — unstressed vowels are almost always single letters.
    let stressModifier = 1;
    if (stress !== "ˈ" && syllableCount && syllableCount >= 2 && g.form.length > 1) {
      // Unstressed syllables in polysyllabic words favor simpler graphemes.
      // CMU data: vowel LPP drops from 1.58 (1-syl) to 1.02 (5-syl),
      // consonant LPP from 1.20 to 1.13. Monosyllables excluded by >= 2 check.
      if (position === "nucleus") {
        // Vowels: strong penalty — unstressed vowels are almost always single letters
        stressModifier = Math.max(0.02, 0.15 / syllableCount);
      } else {
        // Consonants: lighter penalty — digraphs like "th","sh" still appear but less often
        stressModifier = Math.max(0.15, 0.5 / syllableCount);
      }
    }
    const w = g.frequency * posWeight * stressModifier;
    cumulative += w;
    cumulatives.push(cumulative);
    if (captureTrace) weights.push([g.form, w]);
  }

  const totalFrequency = cumulatives[cumulatives.length - 1];
  const randomValue = rand() * totalFrequency;

  let result: FrequencyResult;
  let found = false;
  for (let i = 0; i < candidates.length; i++) {
    if (randomValue < cumulatives[i]) {
      result = { ...candidates[i] };
      found = true;
      break;
    }
  }

  if (!found) result = { ...candidates[candidates.length - 1] };

  if (captureTrace) {
    result!._weights = weights;
    result!._roll = randomValue;
  }

  return result!;
}

// ---------------------------------------------------------------------------
// Pipeline Step 5: Apply doubling
// ---------------------------------------------------------------------------

interface DoublingContext {
  doublingCount: number;
}

interface DoublingTraceInfo {
  attempted: boolean;
  reason?: string;
  probability?: number;
  result?: string;
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
  isLastPhoneme: boolean,
  syllableStress: string | undefined,
  prevReduced: boolean,
  neverDoubleSet: Set<string>,
  rand: RNG,
  traceOut?: DoublingTraceInfo,
  isMonosyllabic?: boolean,
  isFirstInCoda?: boolean,
  nextIsConsonant?: boolean,
): string {
  const skip = (reason: string) => { if (traceOut) { traceOut.attempted = false; traceOut.reason = reason; } return form; };

  if (!config || !config.enabled) return skip("disabled");
  if (!prevPhoneme) return skip("no-prev-phoneme");
  // Allow doubling for the first consonant in a coda cluster ONLY if it has a custom
  // doubledForm (e.g. k→ck in "backs"), not a simple letter repeat (p→pp).
  // Simple repeats before more coda consonants create impossible clusters: ppt, nnd, ddz, ggz.
  if (isCluster) {
    if (position === "coda" && isFirstInCoda && config.doubledForms?.[form]) {
      // Custom doubled form like k→ck is fine in clusters (e.g. "cks")
    } else {
      return skip("in-cluster");
    }
  }
  // Suppress doubling when a coda consonant is followed by another consonant (onset of next syllable).
  // Doubling here creates impossible cross-syllable clusters: "nn" + "t" → "nnt", "ll" + "d" → "lld".
  if (position === "coda" && nextIsConsonant) return skip("coda-before-consonant");
  if (form.length !== 1) {
    // "ck" etc. selected directly from grapheme map — still counts toward maxPerWord
    const doubledValues = config.doubledForms ? Object.values(config.doubledForms) : [];
    if (doubledValues.includes(form)) {
      doublingCtx.doublingCount++;
    }
    return skip("multi-char-grapheme");
  }
  if (position !== "onset" && position !== "coda") return skip("nucleus-position");
  if (doublingCtx.doublingCount >= config.maxPerWord) return skip("max-per-word");

  // Check trigger
  if (config.trigger === "lax-vowel") {
    const isAfterVowel = prevPhoneme.nucleus != null && prevPhoneme.nucleus > 0;
    const isLax = prevPhoneme.tense === false;
    if (!isAfterVowel || !isLax) return skip("trigger:not-after-lax-vowel");
  }

  // neverDoubleFinal — suppress word-final doubling for specific sounds
  if (isEndOfWord && isLastPhoneme && config.neverDoubleFinal?.includes(currPhoneme.sound)) return skip("never-double-final");

  // neverDouble — check both phoneme sound and grapheme form
  if (neverDoubleSet.has(currPhoneme.sound)) return skip("never-double:sound");
  if (neverDoubleSet.has(form)) return skip("never-double:form");

  // finalDoublingOnly
  if (isEndOfWord && config.finalDoublingOnly && config.finalDoublingOnly.length > 0) {
    if (!config.finalDoublingOnly.includes(currPhoneme.sound)) return skip("final-doubling-only");
  }

  // suppressAfterReduction
  if (config.suppressAfterReduction && prevReduced) return skip("suppress-after-reduction");

  // suppressBeforeTense
  if (config.suppressBeforeTense && nextNucleus) {
    if (nextNucleus.tense === true) return skip("suppress-before-tense");
  }

  // Calculate probability
  let prob = config.probability;
  // Monosyllables are inherently stressed even without a ˈ marker.
  // Only apply unstressed modifier to genuinely unstressed syllables in polysyllabic words.
  if (config.unstressedModifier != null && !syllableStress && !isMonosyllabic) {
    prob *= config.unstressedModifier;
  }
  prob = Math.min(100, Math.max(0, Math.round(prob)));
  if (prob <= 0) return skip("zero-probability:unstressed");

  const shouldDouble = getWeightedOption([[true, prob], [false, 100 - prob]], rand);
  if (shouldDouble) {
    doublingCtx.doublingCount++;
    // Use custom doubled form if configured (e.g. k → ck), otherwise repeat
    const doubled = config.doubledForms?.[form] ?? (form + form);
    if (traceOut) { traceOut.attempted = true; traceOut.probability = prob; traceOut.result = doubled; }
    return doubled;
  }
  if (traceOut) { traceOut.attempted = true; traceOut.probability = prob; traceOut.reason = "roll-failed"; }
  return form;
}

// ---------------------------------------------------------------------------
// Consonant pileup repair (grapheme-aware)
// ---------------------------------------------------------------------------

const VOWEL_LETTERS = new Set(["a", "e", "i", "o", "u", "y"]);

/**
 * Check if a character is a vowel letter.
 * Y is treated as vowel unless it's at position 0 followed by a vowel (a,e,i,o,u),
 * in which case it's consonantal (e.g. "yet", "yawn").
 */
function isVowelChar(ch: string, idx: number, str: string): boolean {
  const lower = ch.toLowerCase();
  if (lower === "y") {
    // Y followed by a vowel letter (a,e,i,o,u) is consonantal (e.g. "yet", "yoga", "beyond")
    // Y in all other positions is a vowel (e.g. "gym", "fly", "myth")
    const next = idx + 1 < str.length ? str[idx + 1].toLowerCase() : "";
    return !"aeiou".includes(next);
  }
  return VOWEL_LETTERS.has(lower);
}

function isConsonantLetter(ch: string, idx?: number, str?: string): boolean {
  if (idx !== undefined && str !== undefined) {
    return !isVowelChar(ch, idx, str);
  }
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
function isConsonantToken(token: string, tokenIdx?: number, allTokens?: string[]): boolean {
  const fullStr = allTokens ? allTokens.join("") : token;
  // Compute char offset of this token within the full string
  let charOffset = 0;
  if (allTokens && tokenIdx !== undefined) {
    for (let t = 0; t < tokenIdx; t++) charOffset += allTokens[t].length;
  }
  for (let i = 0; i < token.length; i++) {
    if (isVowelChar(token[i], charOffset + i, fullStr)) return false;
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
    const word = cleanParts.join("");
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
      cleanParts[startPart] = part.slice(0, localStart) + kept.join("") + part.slice(localEnd);
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

    // Tokenize just this part
    const partTokens = tokenizeGraphemes(part, gList);

    // Find the consonant tokens at the relevant edge
    const edgeTokens: { tokenIdx: number; token: string }[] = [];
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

    const newPart = partTokens.filter((_, i) => !toRemoveIndices.has(i)).join("");
    cleanParts[targetPartIdx] = newPart;
    hyphenatedParts[targetPartIdx * 2] = newPart;
  }
}

// ---------------------------------------------------------------------------
// Sonority helpers for SSP-based junction validation
// ---------------------------------------------------------------------------

// Note: sonority ranking for SSP junction checks uses sonorityClass() from
// config/language.ts — the manner-only component of the language's sonority
// hierarchy. See Phase B of #250 for rationale.

/**
 * Check whether a full coda→onset cluster obeys the Sonority Sequencing Principle.
 *
 * The core constraint: across the full coda+onset cluster, sonority must form
 * a valley at the boundary. Specifically:
 *
 * 1. Sonority plateaus (same-rank sequences) are only tolerated for clusters
 *    of total length ≤ 2. For 3+ consonants, the boundary must be a *strict*
 *    minimum — otherwise you get impossible runs like "ctp" (/kt.p/).
 *
 * 2. Within the coda, sonority must not rise toward the boundary.
 *    Within the onset, sonority must not fall away from the boundary.
 *
 * Exception: /s/ can violate SSP (e.g. "str", "sp", "sts") — the s-exception
 * is well-attested across languages.
 *
 * @internal Use {@link validateJunction} as the public API.
 */
export function isJunctionSonorityValid(
  coda: Phoneme[],
  onset: Phoneme[],
  config: LanguageConfig,
): boolean {
  if (coda.length === 0 || onset.length === 0) return true;

  const totalLen = coda.length + onset.length;
  // Two-consonant junctions (e.g. single coda + single onset) are already
  // handled by the articulatory rules; don't over-constrain.
  if (totalLen <= 2) return true;

  const son = (p: Phoneme) => sonorityClass(p, config);
  const isS = (p: Phoneme) => p.sound === "s";

  const codaSon = coda.map(son);
  const onsetSon = onset.map(son);

  const codaEnd = codaSon[codaSon.length - 1];
  const onsetStart = onsetSon[0];

  // Onset must rise (not fall) internally, with s-exception
  // (s+stop onsets like /sp/, /st/, /str/ are well-attested)
  for (let i = 0; i < onsetSon.length - 1; i++) {
    if (onsetSon[i] > onsetSon[i + 1] && !isS(onset[i]) && !isS(onset[i + 1])) {
      return false;
    }
  }

  // --- Core SSP: sonority must valley at the boundary ---

  // Rule 1: Coda must not rise toward boundary. A rising coda (e.g. /ts/: 1→3)
  // creates a sonority peak at the boundary instead of a valley.
  // Blocks /ts.g/ → "tsg", /ts.r/ → "tsr", /ks.n/ → "csn" etc.
  // TODO(#250): Only checks the last two coda phonemes. A 3+ coda like /n,t,s/
  // (5→1→4) has a rise from t→s that's caught, but /l,n,t,s/ would only see
  // t→s. In practice English codas rarely exceed 3 consonants, but a full
  // scan would be more robust.
  if (codaSon.length >= 2 && codaSon[codaSon.length - 2] < codaEnd) {
    return false;
  }

  // Rule 2: Boundary must not be a sonority plateau (codaEnd == onsetStart)
  // for 3+ consonant clusters. E.g. /kt.p/ (1,1,1) — all stops, no valley.
  // Exception: /s/ at either boundary position.
  if (codaEnd === onsetStart && !isS(coda[coda.length - 1]) && !isS(onset[0])) {
    return false;
  }

  // Rule 3: Onset must not start higher than coda-final (that's a continued rise,
  // not a valley). E.g. if coda ends at fricative(3) and onset starts at nasal(4).
  // Exception: /s/ at onset.
  if (onsetStart > codaEnd && !isS(onset[0])) {
    return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Articulatory helpers for feature-based junction validation
// ---------------------------------------------------------------------------

export function mannerGroup(p: Phoneme): string {
  const m = p.mannerOfArticulation;
  if (m === "sibilant") return "fricative";
  if (m === "lateralApproximant") return "liquid";
  return m;
}

export function isCoronal(p: Phoneme): boolean {
  const place = p.placeOfArticulation;
  return place === "alveolar" || place === "postalveolar" || place === "dental";
}

export function placeGroup(p: Phoneme): string {
  const place = p.placeOfArticulation;
  if (place === "bilabial" || place === "labiodental" || place === "labial-velar") return "labial";
  if (place === "dental" || place === "alveolar" || place === "postalveolar") return "coronal";
  if (place === "palatal" || place === "velar") return "dorsal";
  return place; // glottal etc.
}

// ---------------------------------------------------------------------------
// Syllable boundary type for junction validation
// ---------------------------------------------------------------------------

export interface SyllableBoundary {
  codaCluster: Phoneme[];
  onsetCluster: Phoneme[];
}

// ---------------------------------------------------------------------------
// Feature-based junction validation
// ---------------------------------------------------------------------------

/**
 * Validate a syllable junction: articulatory rules (pairwise) + SSP (full cluster).
 *
 * Returns true if the junction is valid, false if it should be repaired.
 */
export function validateJunction(
  coda: Phoneme[],
  onset: Phoneme[],
  config: LanguageConfig,
): boolean {
  if (coda.length === 0 || onset.length === 0) return true;
  const C1 = coda[coda.length - 1];
  const C2 = onset[0];

  // Articulatory rules (pairwise boundary check)
  if (!isJunctionValid(C1, C2, onset)) return false;

  // SSP rules (full cluster check)
  if (!isJunctionSonorityValid(coda, onset, config)) return false;

  return true;
}

/**
 * Pairwise articulatory junction check (coda-final vs onset-initial).
 *
 * @internal Use {@link validateJunction} as the public API.
 */
export function isJunctionValid(C1: Phoneme, C2: Phoneme, onsetCluster: Phoneme[]): boolean {
  // F1: identical phonemes
  if (C1.sound === C2.sound) return false;

  // F2: same mannerGroup AND same exact place of articulation
  if (mannerGroup(C1) === mannerGroup(C2) && C1.placeOfArticulation === C2.placeOfArticulation) return false;

  // F3: stop+stop where neither is coronal
  // (blocks b.k, p.k, g.k, k.b, k.p, k.g — dorsal+labial stops in any direction)
  // F3 also blocks affricate+stop where neither side is coronal — but all English affricates are coronal, so this is moot
  if (mannerGroup(C1) === "stop" && mannerGroup(C2) === "stop" && !isCoronal(C1) && !isCoronal(C2)) return false;

  // F4: stop+stop voicing disagreement (blocks d.k, b.t, g.p etc.)
  if (mannerGroup(C1) === "stop" && mannerGroup(C2) === "stop" && C1.voiced !== C2.voiced) return false;

  // P1: s-exception
  if (C1.sound === "s") return true;
  if (C2.sound === "s" && onsetCluster.length >= 2 && ["t","p","k"].includes(onsetCluster[1]?.sound)) return true;
  if (onsetCluster.length >= 2 && onsetCluster[0].sound === "s" && ["t","p","k"].includes(onsetCluster[1].sound)) return true;

  // P2: coronal onset
  if (isCoronal(C2)) return true;

  // P3: homorganic nasal+stop
  if (mannerGroup(C1) === "nasal" && mannerGroup(C2) === "stop" && placeGroup(C1) === placeGroup(C2)) return true;

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
  config: LanguageConfig,
  consonantGraphemes?: string[],
): void {
  const gList = consonantGraphemes ?? DEFAULT_CONSONANT_GRAPHEMES;

  for (let pass = 0; pass < 10; pass++) {
    let changed = false;
    for (let i = 0; i < boundaries.length; i++) {
      const { onsetCluster, codaCluster } = boundaries[i];
      if (codaCluster.length === 0 || onsetCluster.length === 0) continue;

      if (!validateJunction(codaCluster, onsetCluster, config)) {
        // Drop the last consonant grapheme token from the coda part
        const codaPart = cleanParts[i];
        if (!codaPart) continue;

        const codaTokens = tokenizeGraphemes(codaPart, gList);
        let lastCodaConsonantIdx = -1;
        for (let j = codaTokens.length - 1; j >= 0; j--) {
          if (isConsonantToken(codaTokens[j])) { lastCodaConsonantIdx = j; break; }
        }
        if (lastCodaConsonantIdx < 0) continue;

        // Save the dropped token, then splice it out
        const droppedToken = codaTokens[lastCodaConsonantIdx];
        codaTokens.splice(lastCodaConsonantIdx, 1);

        // If the new last consonant is identical (doubled), drop it too
        const newLastIdx = codaTokens.length > 0
          ? codaTokens.reduce((last, t, j) => isConsonantToken(t) ? j : last, -1)
          : -1;
        if (newLastIdx >= 0 && codaTokens[newLastIdx] === droppedToken) {
          codaTokens.splice(newLastIdx, 1);
        }

        cleanParts[i] = codaTokens.join("");
        hyphenatedParts[i * 2] = cleanParts[i];

        // Update coda phonemes for next pass (cascading repair)
        if (boundaries[i].codaCluster.length > 0) {
          boundaries[i].codaCluster.pop();
        }
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
    const word = cleanParts.join("");

    // Find first run of consonant letters exceeding max
    let runStart = -1;
    let runLen = 0;
    let found = false;
    let foundStart = -1;
    let foundLen = 0;

    for (let i = 0; i <= word.length; i++) {
      if (i < word.length && isConsonantLetter(word[i], i, word)) {
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
      if (globalIdx >= foundStart && globalIdx < foundStart + foundLen && isConsonantLetter(part[ci], globalIdx, word)) {
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

/**
 * Repair vowel pileups by counting raw vowel *letters* (a, e, i, o, u, y).
 * Trims excess vowels from the end of any run exceeding `maxLetters`.
 * Mutates `cleanParts` and `hyphenatedParts` in place.
 */
export function repairVowelLetters(
  cleanParts: string[],
  hyphenatedParts: string[],
  maxLetters: number,
): void {
  for (let i = 0; i < cleanParts.length; i++) {
    const part = cleanParts[i];
    let result = "";
    let vowelRun = 0;
    for (let j = 0; j < part.length; j++) {
      if (isVowelChar(part[j], j, part)) {
        vowelRun++;
        if (vowelRun <= maxLetters) result += part[j];
      } else {
        vowelRun = 0;
        result += part[j];
      }
    }
    if (result !== part) {
      cleanParts[i] = result;
      hyphenatedParts[i * 2] = result;
    }
  }
}

// ---------------------------------------------------------------------------
// Word-final consonant letter repair
// ---------------------------------------------------------------------------

/**
 * Trim word-final consonant letter runs that exceed `maxLetters`.
 * Drops interior consonant letters from the last part's trailing cluster.
 */
export function repairFinalConsonantLetters(
  cleanParts: string[],
  hyphenatedParts: string[],
  maxLetters: number,
): void {
  if (cleanParts.length === 0) return;

  const word = cleanParts.join("");
  // Find trailing consonant run
  let runLen = 0;
  for (let i = word.length - 1; i >= 0; i--) {
    if (isConsonantLetter(word[i], i, word)) runLen++;
    else break;
  }

  if (runLen <= maxLetters) return;

  // Work on the last part
  const lastIdx = cleanParts.length - 1;
  let part = cleanParts[lastIdx];

  // Find trailing consonant letters in this part
  let partRunLen = 0;
  for (let i = part.length - 1; i >= 0; i--) {
    if (isConsonantLetter(part[i], i, part)) partRunLen++;
    else break;
  }

  if (partRunLen <= maxLetters) {
    // The run spans parts — just trim from the last part
    // This is rare; keep what we have
    return;
  }

  // Drop interior consonants from the trailing cluster to fit maxLetters
  const clusterStart = part.length - partRunLen;
  const cluster = part.slice(clusterStart);

  // Keep first and last letters, drop from interior
  if (cluster.length <= maxLetters) return;

  // Keep the last `maxLetters` letters (preserves word-final sounds)
  const trimmed = cluster.slice(cluster.length - maxLetters);
  part = part.slice(0, clusterStart) + trimmed;

  cleanParts[lastIdx] = part;
  hyphenatedParts[lastIdx * 2] = part;
}

// ---------------------------------------------------------------------------
// Silent-e (magic-e / split digraph)
// ---------------------------------------------------------------------------

/** Pre-compiled silent-e swap lookup: phoneme → [{from, to}] sorted longest-from-first. */
type SilentELookup = Map<string, { from: string; to: string }[]>;

function buildSilentELookup(config: SilentEConfig): SilentELookup {
  const map = new Map<string, { from: string; to: string }[]>();
  for (const swap of config.swaps) {
    let list = map.get(swap.phoneme);
    if (!list) { list = []; map.set(swap.phoneme, list); }
    list.push({ from: swap.from, to: swap.to });
  }
  // Sort each list longest-from-first for greedy matching
  for (const list of map.values()) {
    list.sort((a, b) => b.from.length - a.from.length);
  }
  return map;
}

/**
 * Attempt to apply silent-e to the final syllable of a word.
 *
 * Requirements:
 * - Final syllable has exactly 1 coda consonant
 * - That consonant is not in the excluded set
 * - The nucleus phoneme has a matching swap
 * - The written nucleus grapheme matches the swap's `from`
 *
 * Returns the modified cleanParts/hyphenatedParts (mutated in place) or leaves unchanged.
 */
export function applySilentE(
  cleanParts: string[],
  hyphenatedParts: string[],
  syllables: { onset: Phoneme[]; nucleus: Phoneme[]; coda: Phoneme[] }[],
  nucleusGraphemes: string[],
  lookup: SilentELookup,
  excludedCodas: Set<string>,
  probability: number,
  rand: RNG,
): void {
  if (syllables.length === 0 || cleanParts.length === 0) return;

  const lastSylIdx = syllables.length - 1;
  const lastSyl = syllables[lastSylIdx];

  // Must have 1-2 coda consonants (silent-e works with clusters like "nce", "nge", "rse")
  if (lastSyl.coda.length < 1 || lastSyl.coda.length > 2) return;

  // Must have a nucleus
  if (lastSyl.nucleus.length !== 1) return;

  // Check excluded coda sounds (check last coda consonant — the one before "e")
  const codaSound = lastSyl.coda[lastSyl.coda.length - 1].sound;
  if (excludedCodas.has(codaSound)) return;

  // Check if nucleus phoneme has eligible swaps
  const nucleusSound = lastSyl.nucleus[0].sound;
  const swaps = lookup.get(nucleusSound);
  if (!swaps) return;

  // Get the nucleus grapheme that was selected for this syllable
  const nucleusForm = nucleusGraphemes[lastSylIdx];
  if (!nucleusForm) return;

  // Find a matching swap
  const swap = swaps.find(s => s.from === nucleusForm);
  if (!swap) return;

  // Probability check — monosyllables get a higher rate (English monosyllables
  // have ~16.6% silent-e vs ~8-10% for polysyllabic words)
  const effectiveProb = syllables.length === 1 ? Math.min(100, probability * 2.0) : probability;
  if (rand() >= effectiveProb / 100) return;

  // Apply the swap: replace the vowel grapheme in the last clean part and append 'e'
  const lastPartIdx = cleanParts.length - 1;
  const part = cleanParts[lastPartIdx];

  // Find the vowel grapheme in the written part.
  // The nucleus grapheme should appear before the final consonant grapheme(s).
  const fromIdx = part.lastIndexOf(swap.from);
  if (fromIdx < 0) return;

  // Ensure the swap target is in the vowel portion (before the final consonant letters)
  const newPart = part.slice(0, fromIdx) + swap.to + part.slice(fromIdx + swap.from.length) + "e";
  cleanParts[lastPartIdx] = newPart;
  hyphenatedParts[lastPartIdx * 2] = newPart;
}

// ---------------------------------------------------------------------------
// Silent-e: orthographic append (short-vowel contexts)
// ---------------------------------------------------------------------------

/** Pre-compiled lookup: IPA sound → probability */
type AppendAfterLookup = Map<string, number>;

function buildAppendAfterLookup(rules: SilentEAppendRule[]): AppendAfterLookup {
  return new Map(rules.map(r => [r.sound, r.probability]));
}

/**
 * Append silent-e after word-final consonants that orthographically require it
 * (e.g. English words never end in bare 'v'). Unlike magic-e, the vowel
 * grapheme is NOT changed — this is purely an orthographic append.
 *
 * Only applies when the magic-e swap did NOT already fire (to avoid double-e).
 */
export function appendSilentE(
  cleanParts: string[],
  hyphenatedParts: string[],
  syllables: { onset: Phoneme[]; nucleus: Phoneme[]; coda: Phoneme[] }[],
  appendLookup: AppendAfterLookup,
  rand: RNG,
): void {
  if (syllables.length === 0 || cleanParts.length === 0) return;

  const lastSyl = syllables[syllables.length - 1];
  if (lastSyl.coda.length === 0) return;

  // Check the final coda sound
  const finalCodaSound = lastSyl.coda[lastSyl.coda.length - 1].sound;
  const probability = appendLookup.get(finalCodaSound);
  if (probability === undefined) return;

  // Don't append if word already ends in 'e' (magic-e already applied)
  const lastPartIdx = cleanParts.length - 1;
  const part = cleanParts[lastPartIdx];
  if (part.length === 0 || part[part.length - 1] === "e") return;

  // Probability check
  if (rand() >= probability / 100) return;

  cleanParts[lastPartIdx] = part + "e";
  hyphenatedParts[lastPartIdx * 2] = cleanParts[lastPartIdx];
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

  // Silent-e pre-compilation
  const silentEConfig = config.silentE;
  const silentELookup = silentEConfig?.enabled ? buildSilentELookup(silentEConfig) : undefined;
  const silentEExcluded = new Set<string>(silentEConfig?.excludedCodas ?? []);
  const appendAfterLookup = silentEConfig?.enabled && silentEConfig.appendAfter?.length
    ? buildAppendAfterLookup(silentEConfig.appendAfter)
    : undefined;

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
    const nucleusGraphemes: string[] = []; // Track nucleus grapheme form per syllable
    let currentNucleusForm = "";
    let prevGraphemeForm: string | undefined;

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

      const isStartOfWord = syllableIndex === 0;
      const isEndOfWord = syllableIndex === syllables.length - 1;

      // Pipeline
      const isLastPhoneme = phonemeIndex === flattenedPhonemes.length - 1;
      const candidates = getGraphemeCandidates(gMaps, phoneme.sound, position);
      const conditioned = filterByCondition(candidates, expandedConditions, prevPhoneme, nextEntry?.phoneme, phonemeIndex, flattenedPhonemes.length, isStartOfWord, isEndOfWord, prevGraphemeForm);
      const positional = filterByPosition(conditioned, isCluster, isStartOfWord, isEndOfWord);
      // When doubling quota is full, exclude doubled-form graphemes (e.g. "ck") so we don't exceed maxPerWord
      const doubledFormValues = doublingConfig?.doubledForms ? Object.values(doublingConfig.doubledForms) : [];
      const quotaFiltered = doubledFormValues.length > 0 && doublingCtx.doublingCount >= doublingConfig!.maxPerWord
        ? positional.filter(g => !doubledFormValues.includes(g.form))
        : positional;
      const tracing = !!context.trace;
      const selected = selectByFrequency(quotaFiltered.length > 0 ? quotaFiltered : positional, rand, isStartOfWord, isEndOfWord, tracing, position, stress, syllables.length);
      if (position === "nucleus") currentNucleusForm = selected.form;
      const doublingTraceInfo: DoublingTraceInfo | undefined = context.trace ? { attempted: false } : undefined;
      const isMonosyllabic = syllables.length === 1;
      const isFirstInCoda = position === "coda" && prevEntry?.position !== "coda";
      const nextIsConsonant = nextEntry?.position === "onset" || (nextEntry?.syllableIndex === syllableIndex && nextEntry?.position === "coda");
      const form = applyDoubling(selected.form, doublingConfig, doublingCtx, phoneme, prevPhoneme, nextNucleus, position, isCluster, isEndOfWord, isLastPhoneme, stress, prevReduced, neverDoubleSet, rand, doublingTraceInfo, isMonosyllabic, isFirstInCoda, nextIsConsonant);
      prevGraphemeForm = form;

      if (context.trace) {
        context.trace.recordGraphemeSelection({
          phoneme: phoneme.sound,
          position,
          syllableIndex,
          candidates: candidates.map(g => g.form),
          afterCondition: conditioned.map(g => g.form),
          afterPosition: positional.map(g => g.form),
          weights: selected._weights ?? [],
          roll: selected._roll ?? 0,
          selected: selected.form,
          doubled: form !== selected.form,
          doubling: doublingTraceInfo ? {
            attempted: doublingTraceInfo.attempted,
            reason: doublingTraceInfo.reason,
            probability: doublingTraceInfo.probability,
            result: doublingTraceInfo.result,
          } : undefined,
        });
      }

      if (currentSyllable.length > 0 && form.length > 0 &&
          currentSyllable[currentSyllable.length - 1].slice(-1) === form[0]) {
        currentSyllable.push(form.slice(1));
      } else {
        currentSyllable.push(form);
      }

      if (!nextEntry || nextEntry.syllableIndex !== syllableIndex) {
        let syllableStr = applySpellingRules(currentSyllable.join(""), syllableRules, rand, context.trace, `syllable:${syllableIndex}`);

        if (cleanParts.length > 0 && syllableStr.length > 0 &&
            cleanParts[cleanParts.length - 1].slice(-1) === syllableStr[0]) {
          syllableStr = syllableStr.slice(1);
        }

        cleanParts.push(syllableStr);
        hyphenatedParts.push(syllableStr);
        nucleusGraphemes.push(currentNucleusForm);

        if (nextEntry) {
          hyphenatedParts.push("&shy;");
        }

        currentSyllable = [];
        currentNucleusForm = "";
      }
    }

    // Silent-e: rewrite final VCe patterns (magic-e for long vowels)
    if (silentELookup && silentEConfig) {
      applySilentE(
        cleanParts, hyphenatedParts, syllables, nucleusGraphemes,
        silentELookup, silentEExcluded, silentEConfig.probability, rand,
      );
    }

    // Silent-e: orthographic append for consonants that can't end bare (e.g. 'v')
    if (appendAfterLookup) {
      appendSilentE(cleanParts, hyphenatedParts, syllables, appendAfterLookup, rand);
    }

    // Orthographic repairs: configurable boundary-based insertion rules
    // (e.g. insert silent 'u' after 'g' before e/i/y to preserve hard-g).
    const orthoRepairs = config.writtenFormConstraints?.orthographicRepairs;
    if (orthoRepairs) {
      for (let si = 0; si < cleanParts.length - 1; si++) {
        const part = cleanParts[si];
        const nextPart = cleanParts[si + 1];
        if (part.length === 0 || nextPart.length === 0) continue;
        const junction = part[part.length - 1] + nextPart[0];
        for (const repair of orthoRepairs) {
          if (repair.boundaryMatch.test(junction)) {
            cleanParts[si] = part + repair.insert;
            hyphenatedParts[si * 2] = hyphenatedParts[si * 2] + repair.insert;
            break;
          }
        }
      }
    }

    // Consonant pileup repair (grapheme-aware)
    const wfc = config.writtenFormConstraints;
    const maxGraphemes = wfc?.maxConsonantGraphemes;
    if (maxGraphemes) {
      const before = context.trace ? cleanParts.join("") : "";
      repairConsonantPileups(cleanParts, hyphenatedParts, maxGraphemes, wfc?.consonantGraphemes);
      context.trace?.recordRepair("repairConsonantPileups", before, cleanParts.join(""));
    }

    // Feature-based junction validation
    if (syllables.length > 1) {
      const boundaries: SyllableBoundary[] = [];
      for (let si = 0; si < syllables.length - 1; si++) {
        const coda = syllables[si].coda;
        const nextOnset = syllables[si + 1].onset;
        boundaries.push({
          codaCluster: [...coda],
          onsetCluster: nextOnset,
        });
      }
      const beforeJunction = context.trace ? cleanParts.join("") : "";
      repairJunctions(cleanParts, hyphenatedParts, boundaries, config, wfc?.consonantGraphemes);
      context.trace?.recordRepair("repairJunctions", beforeJunction, cleanParts.join(""));
      // Re-run pileup repair in case junction repair changed things
      if (maxGraphemes) {
        const beforePileup = context.trace ? cleanParts.join("") : "";
        repairConsonantPileups(cleanParts, hyphenatedParts, maxGraphemes, wfc?.consonantGraphemes);
        context.trace?.recordRepair("repairConsonantPileups:postJunction", beforePileup, cleanParts.join(""));
      }
    }

    // Raw consonant letter backstop
    if (wfc?.maxConsonantLetters) {
      const before = context.trace ? cleanParts.join("") : "";
      repairConsonantLetters(cleanParts, hyphenatedParts, wfc.maxConsonantLetters);
      context.trace?.recordRepair("repairConsonantLetters", before, cleanParts.join(""));
    }

    // Word-final consonant letter limit
    if (wfc?.maxFinalConsonantLetters) {
      const before = context.trace ? cleanParts.join("") : "";
      repairFinalConsonantLetters(cleanParts, hyphenatedParts, wfc.maxFinalConsonantLetters);
      context.trace?.recordRepair("repairFinalConsonantLetters", before, cleanParts.join(""));
    }

    // Raw vowel letter backstop
    if (wfc?.maxVowelLetters) {
      const before = context.trace ? cleanParts.join("") : "";
      repairVowelLetters(cleanParts, hyphenatedParts, wfc.maxVowelLetters);
      context.trace?.recordRepair("repairVowelLetters", before, cleanParts.join(""));
    }

    // Post-join pass: apply word-scope spelling rules
    let finalClean = applySpellingRules(cleanParts.join(""), wordRules, rand, context.trace, "word");

    // Post-join vowel repair for cross-boundary runs
    if (wfc?.maxVowelLetters) {
      let vResult = "";
      let vowelRun = 0;
      for (let ci = 0; ci < finalClean.length; ci++) {
        if (isVowelChar(finalClean[ci], ci, finalClean)) {
          vowelRun++;
          if (vowelRun <= wfc.maxVowelLetters) vResult += finalClean[ci];
        } else {
          vowelRun = 0;
          vResult += finalClean[ci];
        }
      }
      finalClean = vResult;
    }

    // Re-run consonant backstop after spelling rules (rules like ngx→nks can introduce new runs)
    if (wfc?.maxConsonantGraphemes || wfc?.maxConsonantLetters) {
      const postParts = [finalClean];
      const postHyph = [finalClean];
      const beforePost = context.trace ? finalClean : "";
      if (wfc.maxConsonantGraphemes) {
        repairConsonantPileups(postParts, postHyph, wfc.maxConsonantGraphemes, wfc.consonantGraphemes);
      }
      if (wfc.maxConsonantLetters) {
        repairConsonantLetters(postParts, postHyph, wfc.maxConsonantLetters);
      }
      if (wfc.maxFinalConsonantLetters) {
        repairFinalConsonantLetters(postParts, postHyph, wfc.maxFinalConsonantLetters);
      }
      finalClean = postParts[0];
      context.trace?.recordRepair("postSpellingBackstop", beforePost, finalClean);
    }

    written.clean = finalClean;
    written.hyphenated = hyphenatedParts.join("");
  };
}
