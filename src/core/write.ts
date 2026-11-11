import {
  deriveSpellingBoundaryContext,
  spellingBoundaryContexts,
} from "./spelling-context.js";
import { createSpellingCoveragePlanner } from "./spelling-coverage.js";
import type { SpellingChoiceState } from "./spelling-coverage.js";
import type { DoublingSlot } from "./spelling-doubling.js";
import {
  DEFAULT_CONSONANT_GRAPHEMES,
  tokenizeGraphemes,
  isConsonantToken,
} from "./spelling-budget.js";
export { tokenizeGraphemes } from "./spelling-budget.js";
import { createDoublingModel } from "./spelling-doubling.js";
import type { DoublingState, DoublingTraceInfo } from "./spelling-doubling.js";
import {
  advanceGraphemePrefix,
  buildCategorySets,
  createGraphemeResolver,
  doublingNucleusForm,
  INITIAL_GRAPHEME_PREFIX,
  positionLabel,
  rollGraphemePrefixSyllable,
} from "./grapheme-selection.js";
export {
  filterByPosition,
  normalizeGraphemeCondition,
} from "./grapheme-selection.js";
import {
  BaseSpelling,
  expandReplacement,
  parseReplaceCallbackArgs,
} from "./base-spelling.js";
import type {
  PartEditObserver,
  SpellingEditObserver,
} from "./base-spelling.js";
import { Phoneme, Grapheme, WordGenerationContext } from "../types.js";
import {
  LanguageConfig,
  SpellingRule,
  SpellingRuleLetterRole,
  SilentEConfig,
  SilentEAppendRule,
} from "../config/language.js";
import type { RNG } from "../utils/random.js";
import type { TraceCollector, OrthographySource } from "./trace.js";
import {
  buildOrthographyTrace,
  remapOwnersThroughRewrite,
} from "./orthography-trace.js";
import type { TraceUnitSeed } from "./orthography-trace.js";
export { rewriteOrthographyTraceSurface } from "./orthography-trace.js";
import { validateJunction } from "./junction.js";
import { isVowelChar, isConsonantLetter } from "../utils/letters.js";
import { clonePhoneme } from "./lexical.js";

// ---------------------------------------------------------------------------
// Spelling rules (config-driven post-processing)
// ---------------------------------------------------------------------------

interface CompiledSpellingRule {
  name: string;
  regex: RegExp;
  replacement: string;
  probability: number;
  scope: "syllable" | "word" | "both";
  letterRoles?: SpellingRuleLetterRole[];
}

/** Syllable segment of the phonemes that own the current string's letter at `index`. */
type LetterSegment = (
  index: number,
) => SpellingRuleLetterRole["segment"] | undefined;

function compileSpellingRules(rules: SpellingRule[]): CompiledSpellingRule[] {
  return rules.map((rule) => ({
    name: rule.name,
    regex: new RegExp(rule.pattern, rule.flags ?? "g"),
    replacement: rule.replacement,
    probability: rule.probability ?? 100,
    scope: rule.scope ?? "both",
    letterRoles: compileLetterRoles(rule),
  }));
}

function compileLetterRoles(
  rule: SpellingRule,
): SpellingRuleLetterRole[] | undefined {
  if (!rule.letterRoles?.length) return undefined;
  if (rule.scope !== "syllable") {
    throw new Error(
      `Spelling rule "${rule.name}" uses letterRoles, which require scope "syllable".`,
    );
  }
  const groupCount = new RegExp(`${rule.pattern}|`).exec("")!.length - 1;
  for (const { group } of rule.letterRoles) {
    if (!Number.isInteger(group) || group < 1 || group > groupCount) {
      throw new Error(
        `Spelling rule "${rule.name}" assigns a letter role to missing capture group ${group}.`,
      );
    }
  }
  return rule.letterRoles;
}

/**
 * Whether each constrained capture spells its required segment. The captures
 * tile the match in order, so a group starts where the previous one ends;
 * `start` is the match's index in the current letters.
 */
function hasLetterRoles(
  rule: string,
  roles: SpellingRuleLetterRole[],
  match: string,
  captures: Array<string | undefined>,
  start: number,
  segmentAt: LetterSegment,
): boolean {
  if (captures.join("") !== match) {
    throw new Error(
      `Spelling rule "${rule}" uses letterRoles, so its capture groups must spell the whole match in order.`,
    );
  }
  let groupStart = start;
  const starts = captures.map((capture) => {
    const at = groupStart;
    groupStart += capture?.length ?? 0;
    return at;
  });
  return roles.every(({ group, segment }) => {
    const at = starts[group - 1];
    const length = captures[group - 1]?.length ?? 0;
    if (length === 0) return false;
    for (let i = at; i < at + length; i++) {
      if (segmentAt(i) !== segment) return false;
    }
    return true;
  });
}

type SpellingEdit = (
  start: number,
  removed: number,
  replacement: string,
) => void;

/**
 * Apply a list of compiled spelling rules to a string, handling probabilistic replacements.
 * Rules with letter roles need `segmentAt`, aligned with the string as rules rewrite it.
 */
function applySpellingRules(
  str: string,
  rules: CompiledSpellingRule[],
  rand: RNG,
  trace?: TraceCollector,
  scope?: string,
  observe?: SpellingEditObserver,
  segmentAt?: LetterSegment,
): string {
  let result = str;
  for (const { name, regex, replacement, probability, letterRoles } of rules) {
    regex.lastIndex = 0;
    const source = result;
    let delta = 0;
    result = result.replace(regex, (match: string, ...args: unknown[]) => {
      const { captures, offset, groups } = parseReplaceCallbackArgs(args);
      if (letterRoles) {
        if (!segmentAt)
          throw new Error(
            `Spelling rule "${name}" needs letter roles, which are unavailable here.`,
          );
        // Earlier replacements by this rule already moved later letters by `delta`.
        if (
          !hasLetterRoles(
            name,
            letterRoles,
            match,
            captures,
            offset + delta,
            segmentAt,
          )
        )
          return match;
      }
      let rep: string;
      if (probability >= 100) {
        rep = expandReplacement(
          replacement,
          match,
          captures,
          offset,
          source,
          groups,
        );
      } else {
        if (!(rand() < probability / 100)) return match;
        // Preserve the existing probabilistic replacement contract, including its
        // limited capture expansion, independently of provenance collection.
        rep = replacement;
        for (let i = 0; i < args.length - 2; i++) {
          if (args[i] !== undefined)
            rep = rep.replace(`$${i + 1}`, String(args[i]));
        }
      }
      if (rep !== match)
        observe?.(offset + delta, match.length, rep, `spellingRule:${name}`);
      delta += rep.length - match.length;
      return rep;
    });
    if (trace && result !== source)
      trace.recordRepair(`spellingRule:${name}`, source, result, scope);
  }
  return result;
}

/** Only the final selected vowel is tracked for the terminal-y cap exception. */
interface TerminalVowelUnit {
  start: number;
  end: number;
  phonemeIndex: number;
}

/**
 * Protection of the final selected vowel from the vowel-letter cap, in the
 * order the writer moves through it. Each kind fixes what its offsets measure:
 * - `none`: nothing is protected, or the vowel's surface did not survive.
 * - `syllable`: offsets count from the final syllable's start.
 * - `suffix`: the syllable closed on the vowel; only its surface is kept, and
 *   it stays protected while the last part still ends with it.
 * - `word`: offsets count from the joined word's start.
 */
type FinalVowelState =
  | { kind: "none" }
  | { kind: "syllable"; unit: TerminalVowelUnit }
  | { kind: "suffix"; surface: string; phonemeIndex: number }
  | WordFinalVowel;

interface WordFinalVowel {
  kind: "word";
  unit: TerminalVowelUnit;
  /** Syllable parts kept in step with word edits, for hyphenation after an overflow. */
  parts: string[];
  /** The per-part vowel repair left protected letters over the cap. */
  partsOverflow: boolean;
  /** Where a protected terminal y starts, set once word rules have run. */
  terminalYStart?: number;
  /** The post-join vowel cap left the protected terminal y over the cap. */
  capOverflow: boolean;
}

const NO_FINAL_VOWEL: FinalVowelState = { kind: "none" };

function editSyllableFinalVowel(
  state: FinalVowelState,
  start: number,
  removed: number,
  replacement: string,
): void {
  if (state.kind === "syllable")
    editTerminalVowel(state.unit, start, removed, replacement);
}

/** Close the final syllable: keep the vowel only if it still ends the syllable. */
function captureFinalVowel(
  state: FinalVowelState,
  syllable: string,
): FinalVowelState {
  if (state.kind !== "syllable") return state;
  const { start, end, phonemeIndex } = state.unit;
  const surface =
    start >= 0 && end === syllable.length ? syllable.slice(start, end) : "";
  return surface ? { kind: "suffix", surface, phonemeIndex } : NO_FINAL_VOWEL;
}

/**
 * Part repairs may edit the prefix, but cannot grant a new suffix vowel
 * ownership. Keep the protection only while its selected surface survives.
 */
function keepSurvivingFinalVowel(
  state: FinalVowelState,
  parts: readonly string[],
): FinalVowelState {
  if (state.kind !== "suffix") return state;
  return parts[parts.length - 1].endsWith(state.surface)
    ? state
    : NO_FINAL_VOWEL;
}

/** Start of the letters the per-part vowel repair must keep, if any. */
function protectedFinalVowelStart(
  state: FinalVowelState,
  lastPart: string,
  canWriteFinalIAsY: boolean,
): number | undefined {
  if (state.kind !== "suffix") return undefined;
  const surface = state.surface.toLowerCase();
  const protect =
    surface.endsWith("y") || (canWriteFinalIAsY && surface.endsWith("i"));
  return protect ? lastPart.length - state.surface.length : undefined;
}

/** Join the parts: from here the vowel's offsets count from the word's start. */
function anchorFinalVowel(
  state: FinalVowelState,
  parts: readonly string[],
  partsOverflow: boolean,
): FinalVowelState {
  if (state.kind !== "suffix") return state;
  const length = parts.reduce((total, part) => total + part.length, 0);
  return {
    kind: "word",
    unit: {
      start: length - state.surface.length,
      end: length,
      phonemeIndex: state.phonemeIndex,
    },
    parts: parts.slice(),
    partsOverflow,
    capOverflow: false,
  };
}

/** Word-scope edits move the vowel's offsets and its hyphenation parts together. */
function wordFinalVowelEditor(
  state: FinalVowelState,
): SpellingEdit | undefined {
  if (state.kind !== "word") return undefined;
  return (start, removed, replacement) => {
    editTerminalVowel(state.unit, start, removed, replacement);
    editWrittenParts(state.parts, start, removed, replacement);
  };
}

/** After word rules, record where a still-final protected y starts. */
function protectTerminalY(
  state: FinalVowelState,
  written: string,
): number | undefined {
  if (state.kind !== "word") return undefined;
  const { start, end } = state.unit;
  state.terminalYStart =
    start >= 0 &&
    end > start &&
    end === written.length &&
    written.toLowerCase().endsWith("y")
      ? start
      : undefined;
  return state.terminalYStart;
}

function recordTerminalYCapOverflow(
  state: FinalVowelState,
  overflow: boolean,
): void {
  if (state.kind === "word") state.capOverflow ||= overflow;
}

/** What a protected final vowel left over the cap requires of the output. */
interface FinalVowelOverflow {
  /** Hyphenation parts to keep aligned and output, when protection kept letters over the cap. */
  syncParts?: string[];
  /** The vowel's unit, when its protected terminal y is over the cap. */
  terminalY?: TerminalVowelUnit;
}

function finalVowelOverflow(state: FinalVowelState): FinalVowelOverflow {
  if (state.kind !== "word") return {};
  const terminalY =
    state.terminalYStart !== undefined &&
    (state.partsOverflow || state.capOverflow);
  return {
    syncParts: state.partsOverflow || terminalY ? state.parts : undefined,
    terminalY: terminalY ? state.unit : undefined,
  };
}

function editTerminalVowel(
  unit: TerminalVowelUnit,
  start: number,
  removed: number,
  replacement: string,
): void {
  if (unit.start < 0) return;
  const end = start + removed;
  const change = replacement.length - removed;
  if (end <= unit.start) {
    unit.start += change;
    unit.end += change;
  } else if (start >= unit.end) {
    // An insertion after the unit does not acquire its vowel ownership.
  } else if (start >= unit.start && end <= unit.end) {
    unit.end += change;
  } else {
    // A rewrite spanning multiple selections cannot certify one vowel owner.
    unit.start = -1;
    unit.end = -1;
  }
}

/** Apply an actual spelling edit to syllable parts without aligning characters. */
function editWrittenParts(
  parts: string[],
  start: number,
  removed: number,
  replacement: string,
): void {
  let first = 0;
  let firstOffset = 0;
  while (
    first < parts.length - 1 &&
    firstOffset + parts[first].length <= start
  ) {
    firstOffset += parts[first++].length;
  }
  let last = first;
  let lastOffset = firstOffset;
  const end = start + removed;
  while (last < parts.length - 1 && lastOffset + parts[last].length < end) {
    lastOffset += parts[last++].length;
  }
  const prefix = parts[first].slice(0, start - firstOffset);
  const suffix = parts[last].slice(end - lastOffset);
  parts[first] = prefix + replacement + (first === last ? suffix : "");
  for (let i = first + 1; i < last; i++) parts[i] = "";
  if (first !== last) parts[last] = suffix;
}

interface FrequencyResult extends Grapheme {
  _weights?: [string, number][];
  _roll: number;
  _source: Grapheme;
}

function selectByFrequency(
  weights: [Grapheme, number][],
  rand: RNG,
  tracing: boolean,
): FrequencyResult {
  if (weights.length === 0)
    throw new Error("No legal positive-weight grapheme candidates");
  const totalWeight = weights.reduce((sum, [, weight]) => sum + weight, 0);
  if (!(totalWeight > 0) || !Number.isFinite(totalWeight)) {
    throw new Error("Grapheme weights must have a finite positive total");
  }
  // Preserve the singleton RNG contract, but report its real configured weight.
  const roll = weights.length === 1 ? 0 : rand() * totalWeight;
  if (!(roll >= 0 && roll < totalWeight))
    throw new Error("Grapheme RNG must return a value in [0, 1)");
  let cumulative = 0;
  for (const [grapheme, weight] of weights) {
    cumulative += weight;
    if (roll < cumulative) {
      return {
        ...grapheme,
        _source: grapheme,
        _weights: tracing ? weights.map(([g, w]) => [g.form, w]) : undefined,
        _roll: roll,
      };
    }
  }
  throw new Error("Grapheme selection failed despite positive weights");
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
  observe?: PartEditObserver,
): void {
  const gList = consonantGraphemes ?? DEFAULT_CONSONANT_GRAPHEMES;

  for (let pass = 0; pass < 10; pass++) {
    const word = cleanParts.join("");
    const tokens = tokenizeGraphemes(word, gList);

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

    const tokenCharStarts: number[] = [];
    let charPos = 0;
    for (const t of tokens) {
      tokenCharStarts.push(charPos);
      charPos += t.length;
    }

    const runCharStart = tokenCharStarts[foundRunStart];
    const runCharEnd =
      foundRunStart + foundRunLen < tokens.length
        ? tokenCharStarts[foundRunStart + foundRunLen]
        : word.length;

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
      const partCharStart = startPart > 0 ? cumLengths[startPart - 1] : 0;
      const runTokens = tokens.slice(
        foundRunStart,
        foundRunStart + foundRunLen,
      );

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
      let tokenOffset = localStart + runTokens[0].length;
      const deletions: Array<{ start: number; length: number }> = [];
      for (let i = 0; i < interior.length; i++) {
        if (toRemoveSet.has(i))
          deletions.push({ start: tokenOffset, length: interior[i].length });
        tokenOffset += interior[i].length;
      }
      for (const deletion of deletions.reverse())
        observe?.(
          startPart,
          deletion.start,
          deletion.length,
          "",
          "repairConsonantPileups",
        );
      cleanParts[startPart] =
        part.slice(0, localStart) + kept.join("") + part.slice(localEnd);
      hyphenatedParts[startPart * 2] = cleanParts[startPart];
      continue;
    }

    const boundaryCharIdx = cumLengths[startPart];
    let codaTokenCount = 0;
    for (let ti = foundRunStart; ti < foundRunStart + foundRunLen; ti++) {
      if (tokenCharStarts[ti] < boundaryCharIdx) codaTokenCount++;
      else break;
    }
    const onsetTokenCount = foundRunLen - codaTokenCount;

    const dropFromCoda = codaTokenCount >= onsetTokenCount;
    const targetPartIdx = dropFromCoda ? startPart : endPart;
    const part = cleanParts[targetPartIdx];

    const partTokens = tokenizeGraphemes(part, gList);

    const edgeTokens: { tokenIdx: number; token: string }[] = [];
    if (dropFromCoda) {
      for (
        let i = partTokens.length - 1;
        i >= 0 && isConsonantToken(partTokens[i]);
        i--
      ) {
        edgeTokens.unshift({ tokenIdx: i, token: partTokens[i] });
      }
    } else {
      for (
        let i = 0;
        i < partTokens.length && isConsonantToken(partTokens[i]);
        i++
      ) {
        edgeTokens.push({ tokenIdx: i, token: partTokens[i] });
      }
    }

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
    if (toRemoveIndices.size < excess) {
      const candidates = dropFromCoda ? edgeTokens : [...edgeTokens].reverse();
      for (const e of candidates) {
        if (toRemoveIndices.size >= excess) break;
        if (!toRemoveIndices.has(e.tokenIdx)) toRemoveIndices.add(e.tokenIdx);
      }
    }

    let tokenOffset = 0;
    const deletions: Array<{ start: number; length: number }> = [];
    for (let i = 0; i < partTokens.length; i++) {
      if (toRemoveIndices.has(i))
        deletions.push({ start: tokenOffset, length: partTokens[i].length });
      tokenOffset += partTokens[i].length;
    }
    for (const deletion of deletions.reverse())
      observe?.(
        targetPartIdx,
        deletion.start,
        deletion.length,
        "",
        "repairConsonantPileups",
      );
    const newPart = partTokens
      .filter((_, i) => !toRemoveIndices.has(i))
      .join("");
    cleanParts[targetPartIdx] = newPart;
    hyphenatedParts[targetPartIdx * 2] = newPart;
  }
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
  if (
    place === "bilabial" ||
    place === "labiodental" ||
    place === "labial-velar"
  )
    return "labial";
  if (place === "dental" || place === "alveolar" || place === "postalveolar")
    return "coronal";
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
 * Repair coda→onset junctions using feature-based articulatory rules.
 * Drops grapheme tokens from the coda side when the junction is invalid.
 * Mutates `cleanParts` and `hyphenatedParts` in place.
 *
 * @backstop Since Phase A (#250) moved full-cluster SSP validation into
 * `adjustBoundary` (generate.ts), this function no longer fires in practice
 * — measured at 0 repairs across 50k words (2026-02-21). Retained as a
 * safety net in case upstream generation changes reintroduce invalid
 * junctions. If this fires, it likely indicates a regression in the
 * generation pipeline.
 */
export function repairJunctions(
  cleanParts: string[],
  hyphenatedParts: string[],
  boundaries: SyllableBoundary[],
  config: LanguageConfig,
  consonantGraphemes?: string[],
  observe?: PartEditObserver,
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
          if (isConsonantToken(codaTokens[j])) {
            lastCodaConsonantIdx = j;
            break;
          }
        }
        if (lastCodaConsonantIdx < 0) continue;

        const droppedToken = codaTokens[lastCodaConsonantIdx];
        const droppedStart = codaTokens
          .slice(0, lastCodaConsonantIdx)
          .join("").length;
        observe?.(
          i,
          droppedStart,
          droppedToken.length,
          "",
          "repairJunctions:backstop",
        );
        codaTokens.splice(lastCodaConsonantIdx, 1);

        const newLastIdx =
          codaTokens.length > 0
            ? codaTokens.reduce(
              (last, t, j) => (isConsonantToken(t) ? j : last),
              -1,
            )
            : -1;
        if (newLastIdx >= 0 && codaTokens[newLastIdx] === droppedToken) {
          const secondStart = codaTokens.slice(0, newLastIdx).join("").length;
          observe?.(
            i,
            secondStart,
            codaTokens[newLastIdx].length,
            "",
            "repairJunctions:backstop",
          );
          codaTokens.splice(newLastIdx, 1);
        }

        cleanParts[i] = codaTokens.join("");
        hyphenatedParts[i * 2] = cleanParts[i];

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
  observe?: PartEditObserver,
): void {
  for (let pass = 0; pass < 10; pass++) {
    const word = cleanParts.join("");

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

    const consonantIndices: number[] = [];
    for (let ci = 0; ci < part.length; ci++) {
      const globalIdx = partStart + ci;
      if (
        globalIdx >= foundStart &&
        globalIdx < foundStart + foundLen &&
        isConsonantLetter(part[ci], globalIdx, word)
      ) {
        consonantIndices.push(ci);
      }
    }

    if (consonantIndices.length <= 1) return; // can't drop

    const interior = consonantIndices.slice(1, -1);
    const dropIdx =
      interior.length > 0
        ? interior[Math.floor(interior.length / 2)]
        : consonantIndices[Math.floor(consonantIndices.length / 2)];

    observe?.(dropPartIdx, dropIdx, 1, "", "repairConsonantLetters");
    cleanParts[dropPartIdx] = part.slice(0, dropIdx) + part.slice(dropIdx + 1);
    hyphenatedParts[dropPartIdx * 2] = cleanParts[dropPartIdx];
  }
}

/**
 * Repair vowel pileups by counting raw vowel *letters* (a, e, i, o, u, y).
 * Trims excess vowels from the end of any run exceeding `maxLetters`.
 * The writer may protect its selected terminal vowel unit; other runs still
 * obey the raw-letter cap. A pending final-i rewrite is resolved after joining.
 * Mutates `cleanParts` and `hyphenatedParts` in place.
 */
export function repairVowelLetters(
  cleanParts: string[],
  hyphenatedParts: string[],
  maxLetters: number,
  protectedTerminalStart?: number,
  observe?: PartEditObserver,
): boolean {
  let protectedOverflow = false;
  for (let i = 0; i < cleanParts.length; i++) {
    const part = cleanParts[i];
    const repaired = capVowelLetters(
      part,
      maxLetters,
      i === cleanParts.length - 1 ? protectedTerminalStart : undefined,
      observe &&
        ((start, removed, replacement) =>
          observe(i, start, removed, replacement, "repairVowelLetters")),
    );
    protectedOverflow ||= repaired.protectedOverflow;
    if (repaired.text !== part) {
      cleanParts[i] = repaired.text;
      hyphenatedParts[i * 2] = repaired.text;
    }
  }
  return protectedOverflow;
}

function capVowelLetters(
  str: string,
  maxLetters: number,
  protectedStart = Infinity,
  onEdit?: SpellingEdit,
): { text: string; protectedOverflow: boolean } {
  let text = "";
  let vowelRun = 0;
  let protectedOverflow = false;
  for (let i = 0; i < str.length; i++) {
    if (isVowelChar(str[i], i, str)) {
      vowelRun++;
      if (vowelRun > maxLetters) {
        if (i >= protectedStart) protectedOverflow = true;
        else {
          onEdit?.(text.length, 1, "");
          continue;
        }
      }
    } else {
      vowelRun = 0;
    }
    text += str[i];
  }
  return { text, protectedOverflow };
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
  observe?: PartEditObserver,
): void {
  if (cleanParts.length === 0) return;

  const word = cleanParts.join("");
  let runLen = 0;
  for (let i = word.length - 1; i >= 0; i--) {
    if (isConsonantLetter(word[i], i, word)) runLen++;
    else break;
  }

  if (runLen <= maxLetters) return;

  const lastIdx = cleanParts.length - 1;
  let part = cleanParts[lastIdx];

  let partRunLen = 0;
  for (let i = part.length - 1; i >= 0; i--) {
    if (isConsonantLetter(part[i], i, part)) partRunLen++;
    else break;
  }

  if (partRunLen <= maxLetters) {
    return;
  }

  const clusterStart = part.length - partRunLen;
  const cluster = part.slice(clusterStart);

  if (cluster.length <= maxLetters) return;

  observe?.(
    lastIdx,
    clusterStart,
    cluster.length - maxLetters,
    "",
    "repairFinalConsonantLetters",
  );
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
    if (!list) {
      list = [];
      map.set(swap.phoneme, list);
    }
    list.push({ from: swap.from, to: swap.to });
  }
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
  observe?: PartEditObserver,
): void {
  if (syllables.length === 0 || cleanParts.length === 0) return;

  const lastSylIdx = syllables.length - 1;
  const lastSyl = syllables[lastSylIdx];

  // Must have 1-2 coda consonants (silent-e works with clusters like "nce", "nge", "rse")
  if (lastSyl.coda.length < 1 || lastSyl.coda.length > 2) return;

  if (lastSyl.nucleus.length !== 1) return;

  const codaSound = lastSyl.coda[lastSyl.coda.length - 1].sound;
  if (excludedCodas.has(codaSound)) return;

  const nucleusSound = lastSyl.nucleus[0].sound;
  const swaps = lookup.get(nucleusSound);
  if (!swaps) return;

  const nucleusForm = nucleusGraphemes[lastSylIdx];
  if (!nucleusForm) return;

  const swap = swaps.find((s) => s.from === nucleusForm);
  if (!swap) return;

  // English monosyllables have ~16.6% silent-e vs ~8-10% for polysyllabic words.
  const effectiveProb =
    syllables.length === 1 ? Math.min(100, probability * 2.0) : probability;
  if (rand() >= effectiveProb / 100) return;

  const lastPartIdx = cleanParts.length - 1;
  const part = cleanParts[lastPartIdx];

  const fromIdx = part.lastIndexOf(swap.from);
  if (fromIdx < 0) return;

  observe?.(lastPartIdx, fromIdx, swap.from.length, swap.to, "silentE:swap");
  // A coda spelling that already ends in e (ce, se, ge) supplies the marker: pace, not pacee.
  const marker = part.endsWith("e") ? "" : "e";
  if (marker)
    observe?.(
      lastPartIdx,
      part.length - swap.from.length + swap.to.length,
      0,
      marker,
      "silentE:marker",
    );
  const newPart =
    part.slice(0, fromIdx) +
    swap.to +
    part.slice(fromIdx + swap.from.length) +
    marker;
  cleanParts[lastPartIdx] = newPart;
  hyphenatedParts[lastPartIdx * 2] = newPart;
}

// ---------------------------------------------------------------------------
// Silent-e: orthographic append (short-vowel contexts)
// ---------------------------------------------------------------------------

/** Pre-compiled lookup: IPA sound → probability */
type AppendAfterLookup = Map<string, number>;

function buildAppendAfterLookup(rules: SilentEAppendRule[]): AppendAfterLookup {
  return new Map(rules.map((r) => [r.sound, r.probability]));
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
  observe?: PartEditObserver,
): void {
  if (syllables.length === 0 || cleanParts.length === 0) return;

  const lastSyl = syllables[syllables.length - 1];
  if (lastSyl.coda.length === 0) return;

  const finalCodaSound = lastSyl.coda[lastSyl.coda.length - 1].sound;
  const probability = appendLookup.get(finalCodaSound);
  if (probability === undefined) return;

  const lastPartIdx = cleanParts.length - 1;
  const part = cleanParts[lastPartIdx];
  if (part.length === 0 || part[part.length - 1] === "e") return;

  if (rand() >= probability / 100) return;

  observe?.(lastPartIdx, part.length, 0, "e", "silentE:append");
  cleanParts[lastPartIdx] = part + "e";
  hyphenatedParts[lastPartIdx * 2] = cleanParts[lastPartIdx];
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

type SpellingCoveragePlanner = ReturnType<typeof createSpellingCoveragePlanner>;
type SpellingCoverageScope = Parameters<SpellingCoveragePlanner["apply"]>[2];

/** One word's base spelling, handed from the shared build to a repair path. */
interface WordSpelling {
  context: WordGenerationContext;
  baseSpelling: BaseSpelling;
  cleanParts: string[];
  hyphenatedParts: string[];
  observeParts: PartEditObserver;
  finalVowel: FinalVowelState;
}

/** The joined word after word-scope spelling rules. */
interface WordRuleSpelling {
  clean: string;
  /** Moves the final vowel's offsets with later word edits, when it is tracked. */
  onWordEdit?: SpellingEdit;
  /** Where a protected terminal y starts, if one ends the word. */
  terminalYStart?: number;
}

/** What a repair path hands back to the shared finish. */
interface RepairedSpelling {
  clean: string;
  /** The planner's respelling, which replaces the hyphenated parts. */
  respelledHyphenated?: string;
  overflow: FinalVowelOverflow;
}

/** Whether any coda-onset junction fails validation, which the coverage planner must repair. */
function hasInvalidSyllableJunction(
  syllables: WordGenerationContext["word"]["syllables"],
  config: LanguageConfig,
): boolean {
  return syllables.some(
    (syllable, i) =>
      i + 1 < syllables.length &&
      syllable.coda.length > 0 &&
      syllables[i + 1].onset.length > 0 &&
      !validateJunction(syllable.coda, syllables[i + 1].onset, config),
  );
}

/**
 * Spells `context.word.syllables` into `context.word.written` and returns the
 * base-spelling state it built. `source` places those syllables in the
 * assembled word for the orthography trace; `following` is written text that
 * will directly follow them (a planned suffix).
 */
export type WrittenFormGenerator = (
  context: WordGenerationContext,
  source?: OrthographySource,
  following?: string,
) => BaseSpelling;

/**
 * Creates a `generateWrittenForm` function bound to the given language config's
 * grapheme maps. Conditions are compiled and numeric weights checked at creation.
 */
export function createWrittenFormGenerator(
  config: LanguageConfig,
): WrittenFormGenerator {
  const resolveGraphemes = createGraphemeResolver(config);
  const allCompiledRules = compileSpellingRules(config.spellingRules ?? []);
  const syllableRules = allCompiledRules.filter(
    (r) => r.scope === "syllable" || r.scope === "both",
  );
  const wordRules = allCompiledRules.filter(
    (r) => r.scope === "word" || r.scope === "both",
  );
  // Defer clipping a selected final-i unit until this probabilistic rule decides
  // whether it becomes terminal y. If it remains i, the post-join cap still applies.
  const canWriteFinalIAsY = wordRules.some(
    (r) =>
      r.regex.source === "i$" && r.replacement === "y" && r.probability > 0,
  );
  const vowelSounds = buildCategorySets(config.phonemes).get("vowel")!;
  const doublingModel = createDoublingModel(config.doubling);
  const tryDoubling = doublingModel.sample;
  const preservePhones =
    config.writtenFormConstraints?.policy === "preserve-phones";
  const planCoverage = preservePhones
    ? createSpellingCoveragePlanner(config, resolveGraphemes, doublingModel)
    : undefined;

  const silentEConfig = config.silentE;
  const silentELookup = silentEConfig?.enabled
    ? buildSilentELookup(silentEConfig)
    : undefined;
  const silentEExcluded = new Set<string>(silentEConfig?.excludedCodas ?? []);
  const appendAfterLookup =
    silentEConfig?.enabled && silentEConfig.appendAfter?.length
      ? buildAppendAfterLookup(silentEConfig.appendAfter)
      : undefined;
  const wfc = config.writtenFormConstraints;

  /** Join the parts and apply word-scope rules, moving the final vowel's offsets with every edit. */
  function applyWordRules(
    word: WordSpelling,
    partsOverflow: boolean,
  ): WordRuleSpelling {
    const { context, baseSpelling, cleanParts } = word;
    word.finalVowel = keepSurvivingFinalVowel(word.finalVowel, cleanParts);
    const joined = cleanParts.join("");
    word.finalVowel = anchorFinalVowel(
      word.finalVowel,
      cleanParts,
      partsOverflow,
    );
    const onWordEdit = wordFinalVowelEditor(word.finalVowel);
    const observeWord = baseSpelling.observe("word");
    const clean = applySpellingRules(
      joined,
      wordRules,
      context.rand,
      context.trace,
      "word",
      (start, removed, replacement, rule) => {
        observeWord(start, removed, replacement, rule);
        onWordEdit?.(start, removed, replacement);
      },
    );
    return {
      clean,
      onWordEdit,
      terminalYStart: protectTerminalY(word.finalVowel, clean),
    };
  }

  /** Run the coverage planner at `scope`; a respelling replaces the base spelling. */
  function planCoverageAt(
    word: WordSpelling,
    planner: SpellingCoveragePlanner,
    choices: SpellingChoiceState[],
    scope: SpellingCoverageScope,
    invalidJunction: boolean,
  ): string[] | undefined {
    const outcome = planner.apply(
      word.baseSpelling,
      choices,
      scope,
      invalidJunction,
    );
    word.context.trace?.recordSpellingBudget(outcome);
    return outcome.status === "respell"
      ? word.baseSpelling.projectParts(word.context.word.syllables.length)!
      : undefined;
  }

  /**
   * Certificate (`preserve-phones`) path: the planner respells within budget
   * before and after word rules, instead of deleting letters.
   */
  function writeCoverageSpelling(
    word: WordSpelling,
    planner: SpellingCoveragePlanner,
    choices: SpellingChoiceState[],
  ): RepairedSpelling {
    const invalidJunction = hasInvalidSyllableJunction(
      word.context.word.syllables,
      config,
    );
    const respelledParts = planCoverageAt(
      word,
      planner,
      choices,
      "base-before-word-rules",
      invalidJunction,
    );
    respelledParts?.forEach((part, i) => {
      word.cleanParts[i] = part;
      word.hyphenatedParts[i * 2] = part;
    });

    const rules = applyWordRules(word, false);
    const respelled = planCoverageAt(
      word,
      planner,
      choices,
      "base-after-word-rules",
      invalidJunction,
    );
    if (respelled) {
      return {
        clean: respelled.join(""),
        respelledHyphenated: respelled.join("&shy;"),
        overflow: finalVowelOverflow(word.finalVowel),
      };
    }
    if (wfc?.maxVowelLetters && rules.terminalYStart !== undefined) {
      // Nothing was deleted; a retained terminal y over the cap is the same protected overflow.
      recordTerminalYCapOverflow(
        word.finalVowel,
        capVowelLetters(rules.clean, wfc.maxVowelLetters, rules.terminalYStart)
          .protectedOverflow,
      );
    }
    return {
      clean: rules.clean,
      overflow: finalVowelOverflow(word.finalVowel),
    };
  }

  /** Older path: delete letters to meet the consonant and vowel caps, around word rules. */
  function writeLegacySpelling(word: WordSpelling): RepairedSpelling {
    repairPartConsonants(word);
    const partsOverflow = repairPartVowels(word);
    const rules = applyWordRules(word, partsOverflow);
    const clean = capJoinedVowels(word, rules);
    const overflow = finalVowelOverflow(word.finalVowel);
    return {
      clean: repairConsonantsAfterWordRules(word, clean, overflow),
      overflow,
    };
  }

  /** Per-part consonant pileup, junction and letter-run repairs. */
  function repairPartConsonants({
    context,
    cleanParts,
    hyphenatedParts,
    observeParts,
  }: WordSpelling): void {
    const { syllables } = context.word;
    const maxGraphemes = wfc?.maxConsonantGraphemes;
    if (maxGraphemes) {
      const before = context.trace ? cleanParts.join("") : "";
      repairConsonantPileups(
        cleanParts,
        hyphenatedParts,
        maxGraphemes,
        wfc?.consonantGraphemes,
        observeParts,
      );
      context.trace?.recordRepair(
        "repairConsonantPileups",
        before,
        cleanParts.join(""),
      );
    }

    // Feature-based junction validation (@backstop — Phase E of #250)
    // Since Phase A moved SSP validation upstream into adjustBoundary,
    // this write-phase repair should never fire. Retained as a safety net.
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
      repairJunctions(
        cleanParts,
        hyphenatedParts,
        boundaries,
        config,
        wfc?.consonantGraphemes,
        observeParts,
      );
      if (context.trace) {
        const afterJunction = cleanParts.join("");
        if (afterJunction !== beforeJunction) {
          context.trace.recordRepair(
            "repairJunctions:backstop",
            beforeJunction,
            afterJunction,
          );
        }
      }
      if (maxGraphemes) {
        const beforePileup = context.trace ? cleanParts.join("") : "";
        repairConsonantPileups(
          cleanParts,
          hyphenatedParts,
          maxGraphemes,
          wfc?.consonantGraphemes,
          observeParts,
        );
        context.trace?.recordRepair(
          "repairConsonantPileups:postJunction",
          beforePileup,
          cleanParts.join(""),
        );
      }
    }

    if (wfc?.maxConsonantLetters) {
      const before = context.trace ? cleanParts.join("") : "";
      repairConsonantLetters(
        cleanParts,
        hyphenatedParts,
        wfc.maxConsonantLetters,
        observeParts,
      );
      context.trace?.recordRepair(
        "repairConsonantLetters",
        before,
        cleanParts.join(""),
      );
    }

    if (wfc?.maxFinalConsonantLetters) {
      const before = context.trace ? cleanParts.join("") : "";
      repairFinalConsonantLetters(
        cleanParts,
        hyphenatedParts,
        wfc.maxFinalConsonantLetters,
        observeParts,
      );
      context.trace?.recordRepair(
        "repairFinalConsonantLetters",
        before,
        cleanParts.join(""),
      );
    }
  }

  /** Raw vowel letter backstop per part. Returns whether protected letters stayed over the cap. */
  function repairPartVowels(word: WordSpelling): boolean {
    if (!wfc?.maxVowelLetters) return false;
    const { context, cleanParts, hyphenatedParts, observeParts } = word;
    word.finalVowel = keepSurvivingFinalVowel(word.finalVowel, cleanParts);
    const before = context.trace ? cleanParts.join("") : "";
    const protectedStart = protectedFinalVowelStart(
      word.finalVowel,
      cleanParts[cleanParts.length - 1],
      canWriteFinalIAsY,
    );
    const partsOverflow = repairVowelLetters(
      cleanParts,
      hyphenatedParts,
      wfc.maxVowelLetters,
      protectedStart,
      observeParts,
    );
    context.trace?.recordRepair(
      "repairVowelLetters",
      before,
      cleanParts.join(""),
    );
    return partsOverflow;
  }

  /** Post-join vowel repair for cross-boundary runs. */
  function capJoinedVowels(
    { context, baseSpelling, finalVowel }: WordSpelling,
    rules: WordRuleSpelling,
  ): string {
    if (!wfc?.maxVowelLetters) return rules.clean;
    const repaired = capVowelLetters(
      rules.clean,
      wfc.maxVowelLetters,
      rules.terminalYStart,
      (start, removed, replacement) => {
        baseSpelling.edit(
          "word",
          start,
          removed,
          replacement,
          "postJoinVowelCap",
        );
        rules.onWordEdit?.(start, removed, replacement);
      },
    );
    recordTerminalYCapOverflow(finalVowel, repaired.protectedOverflow);
    context.trace?.recordRepair(
      "repairVowelLetters:postJoin",
      rules.clean,
      repaired.text,
    );
    return repaired.text;
  }

  /** Re-run the consonant backstop after word rules (rules like ngx→nks can introduce new runs). */
  function repairConsonantsAfterWordRules(
    { context, baseSpelling }: WordSpelling,
    clean: string,
    overflow: FinalVowelOverflow,
  ): string {
    if (!wfc?.maxConsonantGraphemes && !wfc?.maxConsonantLetters) return clean;
    const postParts = [clean];
    const postHyph = [clean];
    const beforePost = context.trace ? clean : "";
    const observePost = baseSpelling.observeParts("word", postParts);
    if (wfc.maxConsonantGraphemes) {
      repairConsonantPileups(
        postParts,
        postHyph,
        wfc.maxConsonantGraphemes,
        wfc.consonantGraphemes,
        observePost,
      );
    }
    if (wfc.maxConsonantLetters) {
      repairConsonantLetters(
        postParts,
        postHyph,
        wfc.maxConsonantLetters,
        observePost,
      );
    }
    if (wfc.maxFinalConsonantLetters) {
      repairFinalConsonantLetters(
        postParts,
        postHyph,
        wfc.maxFinalConsonantLetters,
        observePost,
      );
    }
    const afterPost = postParts[0];
    if (overflow.syncParts && afterPost !== clean) {
      // Keep this exception's hyphenated spelling aligned. This affects only
      // presentation partitions, never the selected vowel's production owner.
      let start = 0;
      while (clean[start] === afterPost[start] && start < afterPost.length)
        start++;
      let suffix = 0;
      while (
        suffix < afterPost.length - start &&
        clean[clean.length - 1 - suffix] ===
          afterPost[afterPost.length - 1 - suffix]
      )
        suffix++;
      editWrittenParts(
        overflow.syncParts,
        start,
        clean.length - start - suffix,
        afterPost.slice(start, afterPost.length - suffix),
      );
    }
    context.trace?.recordRepair("postSpellingBackstop", beforePost, afterPost);
    return afterPost;
  }

  return (
    context: WordGenerationContext,
    source?: OrthographySource,
    following?: string,
  ): BaseSpelling => {
    const rand = context.rand;
    const { syllables, written } = context.word;
    const tracing = !!context.trace;
    const traceUnits: TraceUnitSeed[] = [];
    let preRepairSurface = "";
    let preRepairOwners: number[] = [];
    const flattenedPhonemes = syllables.flatMap((syllable, syllableIndex) =>
      (["onset", "nucleus", "coda"] as const).flatMap((position) =>
        syllable[position].map((phoneme, positionIndex) => ({
          phoneme,
          syllableIndex,
          position,
          positionIndex,
          stress: syllable.stress,
        })),
      ),
    );

    const syllableShapes = syllables.map((syllable) => ({
      onset: syllable.onset.length,
      nucleus: syllable.nucleus.length,
      coda: syllable.coda.length,
    }));
    const baseSpelling = new BaseSpelling(
      flattenedPhonemes.map((entry, id) => ({
        id,
        part: "root",
        syllableIndex: entry.syllableIndex,
        segment: entry.position,
        segmentIndex: entry.positionIndex,
        soundAtSpelling: entry.phoneme.sound,
        ...(preservePhones
          ? {
            boundary: {
              phoneme: clonePhoneme(entry.phoneme),
              stress: entry.stress,
              ...(id === flattenedPhonemes.length - 1 && following
                ? { nextWritten: following }
                : {}),
            },
          }
          : {}),
      })),
      tracing,
      preservePhones,
    );
    const boundaryContexts = preservePhones
      ? spellingBoundaryContexts(baseSpelling.current().phones)
      : undefined;
    const spellingChoices: SpellingChoiceState[] = [];
    const cleanParts: string[] = [];
    const hyphenatedParts: string[] = [];
    const observeParts = baseSpelling.observeParts("word", cleanParts);
    let currentSyllable: string[] = [];
    let currentSyllableOwners: number[] = [];
    const nucleusGraphemes: string[] = [];
    let prefix = INITIAL_GRAPHEME_PREFIX;
    let finalVowel = NO_FINAL_VOWEL;

    for (
      let phonemeIndex = 0;
      phonemeIndex < flattenedPhonemes.length;
      phonemeIndex++
    ) {
      const { phoneme, syllableIndex, position, positionIndex } =
        flattenedPhonemes[phonemeIndex];
      const nextEntry = flattenedPhonemes[phonemeIndex + 1];
      const isStartOfWord = syllableIndex === 0;
      const isEndOfWord = syllableIndex === syllables.length - 1;
      const isLastPhoneme = phonemeIndex === flattenedPhonemes.length - 1;
      const segment = { initial: phonemeIndex === 0, final: isLastPhoneme };
      const boundaryContext = deriveSpellingBoundaryContext(
        flattenedPhonemes,
        phonemeIndex,
        syllables.length,
        syllableShapes[syllableIndex],
        isLastPhoneme ? following : undefined,
      );
      const {
        candidates,
        ordinary,
        conditioned,
        positional,
        weights,
        positiveCount,
        fallback,
        preferenceRelaxed,
      } = resolveGraphemes(boundaryContext.slot, prefix);
      const selected = selectByFrequency(weights, rand, tracing);
      const doublingTraceInfo: DoublingTraceInfo | undefined = context.trace
        ? { attempted: false }
        : undefined;
      const doublingSlot: DoublingSlot = {
        ...boundaryContext.doubling,
        form: selected.form,
        nucleusForm: doublingNucleusForm(prefix, position, selected.form),
      };
      const doublingCtx: DoublingState = {
        doublingCount: prefix.doublingCount,
      };
      const form = tryDoubling(
        doublingSlot,
        doublingCtx,
        rand,
        doublingTraceInfo,
      );
      prefix = advanceGraphemePrefix(
        prefix,
        position,
        selected.form,
        form,
        doublingCtx.doublingCount - prefix.doublingCount,
      );
      if (preservePhones) {
        spellingChoices.push({
          ...boundaryContexts![phonemeIndex],
          grapheme: selected._source,
          form,
        });
      }

      const choiceStart = baseSpelling.length;
      baseSpelling.appendChoice(
        phonemeIndex,
        selected.form,
        form,
        preservePhones ? config.graphemes.indexOf(selected._source) : undefined,
      );
      let emitted = form;
      if (
        currentSyllable.length > 0 &&
        form.length > 0 &&
        currentSyllable[currentSyllable.length - 1].slice(-1) === form[0]
      ) {
        baseSpelling.edit(
          "selection",
          choiceStart,
          1,
          "",
          "deduplicateAdjacentLetters",
        );
        emitted = form.slice(1);
      }

      if (context.trace) {
        context.trace.recordGraphemeSelection({
          index: phonemeIndex,
          phoneme: phoneme.sound,
          position,
          syllableIndex,
          candidates: candidates.map((g) => g.form),
          afterCondition: conditioned.map((g) => g.form),
          afterPosition: positional.map((g) => g.form),
          weights: selected._weights ?? [],
          roll: selected._roll ?? 0,
          selected: selected.form,
          emitted,
          doubled: form !== selected.form,
          selection: {
            version: 1,
            positionScope: selected.positionScope ?? "syllable",
            segmentPosition: positionLabel(segment.initial, segment.final),
            syllablePosition: positionLabel(isStartOfWord, isEndOfWord),
            ordinaryCandidates: ordinary.length,
            afterCondition: conditioned.length,
            afterPosition: positional.length,
            positiveCandidates: positiveCount,
            fallback,
            preferenceRelaxed,
          },
          doubling: doublingTraceInfo
            ? {
              attempted: doublingTraceInfo.attempted,
              reason: doublingTraceInfo.reason,
              probability: doublingTraceInfo.probability,
              result: doublingTraceInfo.result,
            }
            : undefined,
        });
      }
      currentSyllable.push(emitted);
      if (
        config.writtenFormConstraints?.maxVowelLetters &&
        isLastPhoneme &&
        position === "nucleus" &&
        vowelSounds.has(phoneme.sound) &&
        emitted.length > 0
      ) {
        const end = currentSyllable.join("").length;
        finalVowel = {
          kind: "syllable",
          unit: { start: end - emitted.length, end, phonemeIndex },
        };
      }
      if (tracing && emitted.length > 0) {
        for (let ci = 0; ci < emitted.length; ci++) {
          currentSyllableOwners.push(phonemeIndex);
        }
      }
      if (tracing) {
        traceUnits.push({
          id: phonemeIndex,
          graphemeSelectionIndex: phonemeIndex,
          phoneme: phoneme.sound,
          position,
          positionIndex,
          syllableIndex,
          selected: selected.form,
          emitted,
        });
      }

      if (!nextEntry || nextEntry.syllableIndex !== syllableIndex) {
        const rawSyllable = currentSyllable.join("");
        const syllableStart = cleanParts.reduce(
          (length, part) => length + part.length,
          0,
        );
        const observeSyllable = baseSpelling.observe(
          "syllable",
          syllableStart,
          syllableIndex,
        );
        let syllableStr = applySpellingRules(
          rawSyllable,
          syllableRules,
          rand,
          context.trace,
          `syllable:${syllableIndex}`,
          (start, removed, replacement, rule) => {
            observeSyllable(start, removed, replacement, rule);
            editSyllableFinalVowel(finalVowel, start, removed, replacement);
          },
          (index) => baseSpelling.segmentAt(syllableStart + index),
        );
        let syllableOwners = tracing
          ? remapOwnersThroughRewrite(
            rawSyllable,
            currentSyllableOwners,
            syllableStr,
          )
          : [];

        if (
          cleanParts.length > 0 &&
          syllableStr.length > 0 &&
          cleanParts[cleanParts.length - 1].slice(-1) === syllableStr[0]
        ) {
          baseSpelling.edit(
            "syllable",
            syllableStart,
            1,
            "",
            "deduplicateSyllableJoin",
          );
          syllableStr = syllableStr.slice(1);
          editSyllableFinalVowel(finalVowel, 0, 1, "");
          if (tracing) syllableOwners = syllableOwners.slice(1);
        }

        cleanParts.push(syllableStr);
        finalVowel = captureFinalVowel(finalVowel, syllableStr);
        hyphenatedParts.push(syllableStr);
        nucleusGraphemes.push(prefix.nucleusForm);
        if (tracing) {
          preRepairSurface += syllableStr;
          preRepairOwners.push(...syllableOwners);
        }

        if (nextEntry) {
          hyphenatedParts.push("&shy;");
        }

        currentSyllable = [];
        prefix = rollGraphemePrefixSyllable(prefix);
        currentSyllableOwners = [];
      }
    }

    if (tracing) {
      const cleanSurface = cleanParts.join("");
      if (preRepairSurface !== cleanSurface) {
        preRepairOwners = remapOwnersThroughRewrite(
          preRepairSurface,
          preRepairOwners,
          cleanSurface,
        );
        preRepairSurface = cleanSurface;
      }
    }

    // Silent-e: rewrite final VCe patterns (magic-e for long vowels)
    if (silentELookup && silentEConfig) {
      applySilentE(
        cleanParts,
        hyphenatedParts,
        syllables,
        nucleusGraphemes,
        silentELookup,
        silentEExcluded,
        silentEConfig.probability,
        rand,
        observeParts,
      );
    }

    // Silent-e: orthographic append for consonants that can't end bare (e.g. 'v')
    if (appendAfterLookup) {
      appendSilentE(
        cleanParts,
        hyphenatedParts,
        syllables,
        appendAfterLookup,
        rand,
        observeParts,
      );
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
            observeParts(
              si,
              part.length,
              0,
              repair.insert,
              `orthographicRepair:${repair.name}`,
            );
            cleanParts[si] = part + repair.insert;
            hyphenatedParts[si * 2] = hyphenatedParts[si * 2] + repair.insert;
            break;
          }
        }
      }
    }

    const word: WordSpelling = {
      context,
      baseSpelling,
      cleanParts,
      hyphenatedParts,
      observeParts,
      finalVowel,
    };
    const repaired = planCoverage
      ? writeCoverageSpelling(word, planCoverage, spellingChoices)
      : writeLegacySpelling(word);
    const { clean: finalClean, overflow } = repaired;

    if (tracing && context.trace) {
      const finalOwners = remapOwnersThroughRewrite(
        preRepairSurface,
        preRepairOwners,
        finalClean,
      );
      if (overflow.terminalY) {
        const unitLength = overflow.terminalY.end - overflow.terminalY.start;
        finalOwners.fill(
          overflow.terminalY.phonemeIndex,
          finalClean.length - unitLength,
        );
      }
      context.trace.orthographyTrace = buildOrthographyTrace(
        finalClean,
        finalOwners,
        traceUnits,
        context.trace,
        source,
      );
    }

    baseSpelling.assertSurface(finalClean);
    if (context.trace) context.trace.baseSpelling = baseSpelling.snapshot();
    written.clean = finalClean;
    written.hyphenated =
      repaired.respelledHyphenated ??
      (overflow.syncParts
        ? overflow.syncParts.join("&shy;")
        : hyphenatedParts.join(""));
    return baseSpelling;
  };
}
