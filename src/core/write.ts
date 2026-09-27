import { createFollowingViewGuard } from "./spelling-following-guard.js";
import { createGraphemeSequenceModel } from "./spelling-sequence-model.js";
import { createSequenceEvidenceSession } from "./spelling-sequence-evidence.js";
import { createCompletionPlanner } from "./spelling-completion-planner.js";
import { createSpellingRuleSlots } from "./spelling-construction-slots.js";
import type { SharedSpellingSlot } from "./spelling-construction.js";
import { spellingBoundaryContexts } from "./spelling-context.js";
import { createSpellingCoveragePlanner } from "./spelling-coverage.js";
import type { SpellingChoiceState } from "./spelling-coverage.js";
import type { GraphemeSlot } from "./grapheme-selection.js";
import type { DoublingSlot } from "./spelling-doubling.js";
import { DEFAULT_CONSONANT_GRAPHEMES, tokenizeGraphemes, isConsonantToken } from "./spelling-budget.js";
export { tokenizeGraphemes } from "./spelling-budget.js";
import { createDoublingModel } from "./spelling-doubling.js";
import { createSpellingNormalizer } from "./spelling-normalization.js";
import type { HistoricalSelectionState, NormalizationSite } from "./spelling-normalization-types.js";
import type { DoublingState, DoublingTraceInfo } from "./spelling-doubling.js";
import { createGraphemeResolver, positionLabel } from "./grapheme-selection.js";
export { filterByPosition, normalizeGraphemeCondition } from "./grapheme-selection.js";
import { BaseSpelling, createSplitSpellingRuntime, createSharedSpellingRuntime, expandReplacement } from "./base-spelling.js";
import type { PartEditObserver, PartSpellingBatchEdit, SpellingEditObserver } from "./base-spelling.js";
import { Phoneme, Grapheme, WordGenerationContext } from "../types.js";
import { LanguageConfig, SpellingRule, SilentEConfig, SilentEAppendRule } from "../config/language.js";
import type { RNG } from "../utils/random.js";
import type { TraceCollector, OrthographyTrace, OrthographyUnitTrace, TraceLink, StructuralTrace } from "./trace.js";
import { validateJunction } from "./junction.js";
import { isVowelChar, isConsonantLetter } from "../utils/letters.js";

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
export function applySpellingRules(str: string, rules: CompiledSpellingRule[], rand: RNG, trace?: TraceCollector, scope?: string, observe?: SpellingEditObserver): string {
  let result = str;
  for (const { name, regex, replacement, probability } of rules) {
    regex.lastIndex = 0;
    const source = result;
    let delta = 0;
    result = result.replace(regex, (match: string, ...args: unknown[]) => {
      const named = typeof args[args.length - 1] === "object";
      const offset = args[args.length - (named ? 3 : 2)] as number;
      let rep: string;
      if (probability >= 100) {
        const captures = args.slice(0, -(named ? 3 : 2)) as Array<string | undefined>;
        const groups = named ? args[args.length - 1] as Record<string, string> : undefined;
        rep = expandReplacement(replacement, match, captures, offset, source, groups);
      } else {
        if (!(rand() < probability / 100)) return match;
        // Preserve the existing probabilistic replacement contract, including its
        // limited capture expansion, independently of provenance collection.
        rep = replacement;
        for (let i = 0; i < args.length - 2; i++) {
          if (args[i] !== undefined) rep = rep.replace(`$${i + 1}`, String(args[i]));
        }
      }
      if (observe?.(offset + delta, match.length, rep, `spellingRule:${name}`) === false) return match;
      delta += rep.length - match.length;
      return rep;
    });
    if (trace && result !== source) trace.recordRepair(`spellingRule:${name}`, source, result, scope);
  }
  return result;
}

/** Rejecting observers must supply batch for atomic multi-edit operations. */
export function applyPartEditBatch(edits: readonly PartSpellingBatchEdit[], observe?: PartEditObserver): boolean {
  if (observe?.batch) return observe.batch(edits);
  for (const edit of edits) {
    if (observe?.(edit.part, edit.start, edit.deleteCount, edit.insert, edit.rule) === false) {
      throw new Error("A rejecting multi-edit observer must implement batch");
    }
  }
  return true;
}

interface TraceUnitSeed {
  id: number;
  graphemeSelectionIndex: number;
  phoneme: string;
  position: string;
  positionIndex: number;
  syllableIndex: number;
  selected: string;
  emitted: string;
}

type EditOp = "match" | "substitute" | "insert" | "delete";

/**
 * Map character ownership from a source string onto a rewritten target string.
 *
 * Uses edit-distance alignment and propagates ownership through substitutions
 * and insertions so every target character can be highlighted in the debug UI.
 */
function remapOwnersThroughRewrite(source: string, sourceOwners: number[], target: string): number[] {
  if (source === target) return sourceOwners.slice(0, target.length);
  if (target.length === 0) return [];
  if (source.length === 0) return new Array<number>(target.length).fill(-1);

  const m = source.length;
  const n = target.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const substCost = source[i - 1] === target[j - 1] ? 0 : 1;
      const del = dp[i - 1][j] + 1;
      const ins = dp[i][j - 1] + 1;
      const sub = dp[i - 1][j - 1] + substCost;
      dp[i][j] = Math.min(del, ins, sub);
    }
  }

  const ops: EditOp[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const substCost = source[i - 1] === target[j - 1] ? 0 : 1;
      if (dp[i][j] === dp[i - 1][j - 1] + substCost) {
        ops.push(substCost === 0 ? "match" : "substitute");
        i--;
        j--;
        continue;
      }
    }
    if (j > 0 && dp[i][j] === dp[i][j - 1] + 1) {
      ops.push("insert");
      j--;
      continue;
    }
    if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      ops.push("delete");
      i--;
      continue;
    }
    // Defensive fallback for any rare tie/rounding edge.
    if (i > 0 && j > 0) {
      ops.push("substitute");
      i--;
      j--;
    } else if (j > 0) {
      ops.push("insert");
      j--;
    } else {
      ops.push("delete");
      i--;
    }
  }
  ops.reverse();

  const targetOwners = new Array<number>(n).fill(-1);
  let srcIdx = 0;
  let tgtIdx = 0;

  for (const op of ops) {
    if (op === "match" || op === "substitute") {
      targetOwners[tgtIdx] = sourceOwners[srcIdx] ?? -1;
      srcIdx++;
      tgtIdx++;
      continue;
    }
    if (op === "delete") {
      srcIdx++;
      continue;
    }
    // Inserted character: attach to the closest known neighbor owner.
    const leftOwner = tgtIdx > 0 ? targetOwners[tgtIdx - 1] : -1;
    const rightOwner = sourceOwners[srcIdx] ?? -1;
    targetOwners[tgtIdx] = leftOwner !== -1 ? leftOwner : rightOwner;
    tgtIdx++;
  }

  // Fill any unresolved owners by nearest assigned neighbor.
  for (let k = 0; k < targetOwners.length; k++) {
    if (targetOwners[k] !== -1) continue;
    let resolved = -1;
    for (let l = k - 1; l >= 0; l--) {
      if (targetOwners[l] !== -1) {
        resolved = targetOwners[l];
        break;
      }
    }
    if (resolved === -1) {
      for (let r = k + 1; r < targetOwners.length; r++) {
        if (targetOwners[r] !== -1) {
          resolved = targetOwners[r];
          break;
        }
      }
    }
    targetOwners[k] = resolved;
  }

  return targetOwners;
}

function buildLinksForUnit(unit: TraceUnitSeed, trace: TraceCollector): TraceLink[] {
  const links: TraceLink[] = [{
    kind: "graphemeSelection",
    index: unit.graphemeSelectionIndex,
    label: `graphemeSelection:${unit.graphemeSelectionIndex}`,
  }];

  const repNeedles = [unit.emitted, unit.selected].filter(n => !!n && n.length >= 2);
  const hasTokenLike = (text: string, needle: string): boolean => {
    if (!needle || needle.length < 2) return false;
    // Boundaries are start/end or non-letter to reduce accidental substring matches.
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`, "i");
    return rx.test(text);
  };
  for (let i = 0; i < trace.repairs.length; i++) {
    const r = trace.repairs[i];
    if (repNeedles.some(n => hasTokenLike(r.before, n) || hasTokenLike(r.after, n))) {
      links.push({ kind: "repair", index: i, label: r.rule });
    }
  }

  for (let i = 0; i < trace.structural.length; i++) {
    const s = trace.structural[i];
    if (structuralEventReferencesUnit(s, unit)) {
      links.push({ kind: "structural", index: i, label: s.event });
    }
  }

  return links;
}

function structuralEventReferencesUnit(event: StructuralTrace, unit: TraceUnitSeed): boolean {
  switch (event.event) {
  case "boundaryDrop":
    // Dropped-coda segment is removed pre-orthography; link only the onset-side survivor.
    return unit.position === "onset" &&
      unit.syllableIndex === event.rightSyllableIndex &&
      unit.phoneme === event.beforeOnset;
  case "sspBoundaryDrop":
    return (unit.position === "coda" &&
      unit.syllableIndex === event.leftSyllableIndex &&
      event.remainingCoda.includes(unit.phoneme)) ||
      (unit.position === "onset" &&
      unit.syllableIndex === event.rightSyllableIndex &&
      event.onset.includes(unit.phoneme));
  case "risingCodaBoundaryDrop":
  case "junctionBoundaryDrop":
    return (unit.position === "coda" &&
      unit.syllableIndex === event.leftSyllableIndex &&
      event.remainingCoda.includes(unit.phoneme)) ||
      (unit.position === "onset" &&
      unit.syllableIndex === event.rightSyllableIndex &&
      event.onset.includes(unit.phoneme));
  case "finalS":
    return unit.position === "coda" &&
      unit.syllableIndex === event.syllableIndex &&
      unit.phoneme === "s";
  case "nasalStopExtension":
    return unit.position === "coda" &&
      unit.syllableIndex === event.syllableIndex &&
      (unit.phoneme === event.nasal || unit.phoneme === event.appendedStop);
  case "vowelHiatusFallback":
    return unit.position === "onset" &&
      unit.syllableIndex === event.rightSyllableIndex &&
      unit.phoneme === event.inserted;
  case "morphPrefixHiatusFallback":
  case "morphSuffixHiatusFallback":
    return unit.position === "onset" &&
      unit.syllableIndex === event.syllableIndex &&
      unit.phoneme === event.inserted;
  case "aspirationDecision":
    if (!event.targetPhoneme) return false;
    return unit.position === (event.targetSegment ?? "onset") &&
      unit.syllableIndex === event.syllableIndex &&
      (event.targetIndex == null || unit.positionIndex === event.targetIndex) &&
      unit.phoneme === event.targetPhoneme;
  }
}

function buildOrthographyTrace(
  surface: string,
  finalOwners: number[],
  units: TraceUnitSeed[],
  trace: TraceCollector,
): OrthographyTrace {
  const unitById = new Map<number, TraceUnitSeed>(units.map(u => [u.id, u]));
  const spans = new Map<number, { start: number; end: number }>();
  for (let i = 0; i < finalOwners.length; i++) {
    const owner = finalOwners[i];
    if (!unitById.has(owner)) continue;
    const existing = spans.get(owner);
    if (!existing) {
      spans.set(owner, { start: i, end: i });
    } else {
      existing.end = i;
    }
  }

  const chars = surface.split("").map((char, index) => {
    const unitId = finalOwners[index] ?? -1;
    const owner = unitById.get(unitId);
    return {
      index,
      char,
      unitId,
      graphemeSelectionIndex: owner ? owner.graphemeSelectionIndex : -1,
    };
  });

  const toUnitTrace = (unit: TraceUnitSeed): OrthographyUnitTrace => {
    const span = spans.get(unit.id);
    return {
      id: unit.id,
      graphemeSelectionIndex: unit.graphemeSelectionIndex,
      phoneme: unit.phoneme,
      position: unit.position,
      syllableIndex: unit.syllableIndex,
      selected: unit.selected,
      emitted: unit.emitted,
      present: !!span,
      start: span ? span.start : null,
      end: span ? span.end : null,
      links: buildLinksForUnit(unit, trace),
    };
  };

  const graphemeUnits = units.map(toUnitTrace);
  return { surface, chars, graphemeUnits, alignment: "inferred" };
}

export function rewriteOrthographyTraceSurface(trace: TraceCollector, surface: string): void {
  const orthography = trace.orthographyTrace;
  if (!orthography) return;

  const unitById = new Map<number, OrthographyUnitTrace>(
    orthography.graphemeUnits.map((unit) => [unit.id, unit]),
  );
  const sourceOwners = orthography.chars.map((char) => char.unitId);
  const remappedOwners = remapOwnersThroughRewrite(orthography.surface, sourceOwners, surface);
  const spans = new Map<number, { start: number; end: number }>();

  for (let i = 0; i < remappedOwners.length; i++) {
    const owner = remappedOwners[i];
    if (!unitById.has(owner)) continue;
    const span = spans.get(owner);
    if (span) {
      span.end = i;
    } else {
      spans.set(owner, { start: i, end: i });
    }
  }

  orthography.surface = surface;
  orthography.chars = surface.split("").map((char, index) => {
    const unitId = remappedOwners[index] ?? -1;
    const unit = unitById.get(unitId);
    return {
      index,
      char,
      unitId,
      graphemeSelectionIndex: unit?.graphemeSelectionIndex ?? -1,
    };
  });
  orthography.graphemeUnits = orthography.graphemeUnits.map((unit) => {
    const span = spans.get(unit.id);
    return {
      ...unit,
      present: !!span,
      start: span ? span.start : null,
      end: span ? span.end : null,
    };
  });
}

interface FrequencyResult extends Grapheme {
  _weights?: [string, number][];
  _roll: number;
  _source: Grapheme;
}

function selectByFrequency(weights: [Grapheme, number][], rand: RNG, tracing: boolean): FrequencyResult {
  if (weights.length === 0) throw new Error("No legal positive-weight grapheme candidates");
  const totalWeight = weights.reduce((sum, [, weight]) => sum + weight, 0);
  if (!(totalWeight > 0) || !Number.isFinite(totalWeight)) {
    throw new Error("Grapheme weights must have a finite positive total");
  }
  // Preserve the singleton RNG contract, but report its real configured weight.
  const roll = weights.length === 1 ? 0 : rand() * totalWeight;
  if (!(roll >= 0 && roll < totalWeight)) throw new Error("Grapheme RNG must return a value in [0, 1)");
  let cumulative = 0;
  for (const [grapheme, weight] of weights) {
    cumulative += weight;
    if (roll < cumulative) {
      return { ...grapheme, _source: grapheme, _weights: tracing ? weights.map(([g, w]) => [g.form, w]) : undefined, _roll: roll };
    }
  }
  throw new Error("Grapheme selection failed despite positive weights");
}

// ---------------------------------------------------------------------------
// Pipeline Step 5: Doubling (factory pattern)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Consonant pileup repair (grapheme-aware)
// ---------------------------------------------------------------------------

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
      let tokenOffset = localStart + runTokens[0].length;
      const deletions: Array<{ start: number; length: number }> = [];
      for (let i = 0; i < interior.length; i++) {
        if (toRemoveSet.has(i)) deletions.push({ start: tokenOffset, length: interior[i].length });
        tokenOffset += interior[i].length;
      }
      if (!applyPartEditBatch(deletions.reverse().map(deletion => ({ part: startPart, start: deletion.start,
        deleteCount: deletion.length, insert: "", rule: "repairConsonantPileups" })), observe)) return;
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

    let tokenOffset = 0;
    const deletions: Array<{ start: number; length: number }> = [];
    for (let i = 0; i < partTokens.length; i++) {
      if (toRemoveIndices.has(i)) deletions.push({ start: tokenOffset, length: partTokens[i].length });
      tokenOffset += partTokens[i].length;
    }
    if (!applyPartEditBatch(deletions.reverse().map(deletion => ({ part: targetPartIdx, start: deletion.start,
      deleteCount: deletion.length, insert: "", rule: "repairConsonantPileups" })), observe)) return;
    const newPart = partTokens.filter((_, i) => !toRemoveIndices.has(i)).join("");
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
          if (isConsonantToken(codaTokens[j])) { lastCodaConsonantIdx = j; break; }
        }
        if (lastCodaConsonantIdx < 0) continue;

        // Save the dropped token, then splice it out
        const droppedToken = codaTokens[lastCodaConsonantIdx];
        const droppedStart = codaTokens.slice(0, lastCodaConsonantIdx).join("").length;
        const deletions: PartSpellingBatchEdit[] = [{ part: i, start: droppedStart, deleteCount: droppedToken.length,
          insert: "", rule: "repairJunctions:backstop" }];
        codaTokens.splice(lastCodaConsonantIdx, 1);

        // If the new last consonant is identical (doubled), drop it too
        const newLastIdx = codaTokens.length > 0
          ? codaTokens.reduce((last, t, j) => isConsonantToken(t) ? j : last, -1)
          : -1;
        if (newLastIdx >= 0 && codaTokens[newLastIdx] === droppedToken) {
          const secondStart = codaTokens.slice(0, newLastIdx).join("").length;
          deletions.push({ part: i, start: secondStart, deleteCount: codaTokens[newLastIdx].length,
            insert: "", rule: "repairJunctions:backstop" });
          codaTokens.splice(newLastIdx, 1);
        }

        if (!applyPartEditBatch(deletions, observe)) continue;
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
  observe?: PartEditObserver,
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

    if (observe?.(dropPartIdx, dropIdx, 1, "", "repairConsonantLetters") === false) return;
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
  observe?: PartEditObserver,
): void {
  for (let i = 0; i < cleanParts.length; i++) {
    const part = cleanParts[i];
    let result = "";
    let vowelRun = 0;
    for (let j = 0; j < part.length; j++) {
      if (isVowelChar(part[j], j, part)) {
        vowelRun++;
        if (vowelRun <= maxLetters) result += part[j];
        else if (observe?.(i, result.length, 1, "", "repairVowelLetters") === false) result += part[j];
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
  observe?: PartEditObserver,
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
  if (observe?.(lastIdx, clusterStart, cluster.length - maxLetters, "", "repairFinalConsonantLetters") === false) return;
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
  observe?: PartEditObserver,
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
  if (!applyPartEditBatch([
    { part: lastPartIdx, start: fromIdx, deleteCount: swap.from.length, insert: swap.to, rule: "silentE:swap" },
    { part: lastPartIdx, start: part.length - swap.from.length + swap.to.length, deleteCount: 0, insert: "e", rule: "silentE:marker" },
  ], observe)) return;
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
  observe?: PartEditObserver,
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

  if (observe?.(lastPartIdx, part.length, 0, "e", "silentE:append") === false) return;
  cleanParts[lastPartIdx] = part + "e";
  hyphenatedParts[lastPartIdx * 2] = cleanParts[lastPartIdx];
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a `generateWrittenForm` function bound to the given language config's
 * grapheme maps. Conditions are compiled and numeric weights checked at creation.
 */
export function createWrittenFormGenerator(config: LanguageConfig): (context: WordGenerationContext) => void {
  const resolveGraphemes = createGraphemeResolver(config);
  const followingGuard = config.followingLetters ? createFollowingViewGuard(config, config.followingLetters.targets) : undefined;
  const allCompiledRules = compileSpellingRules(config.spellingRules ?? []);
  const syllableRules = allCompiledRules.filter(r => r.scope === "syllable" || r.scope === "both");
  const wordRules = allCompiledRules.filter(r => r.scope === "word" || r.scope === "both");
  const sharedRules = config.sharedSpellings === undefined ? undefined : structuredClone(config.sharedSpellings);
  const schedule = sharedRules === undefined ? undefined : createSpellingRuleSlots(config.spellingRules ?? [], sharedRules);
  const compilePass = (phase: "syllable" | "word") => schedule?.slots(phase).map(slot => slot.kind === "shared"
    ? slot : { ...slot, compiled: compileSpellingRules([slot.rule]) });
  const sharedPasses = { syllable: compilePass("syllable"), word: compilePass("word") };
  const doublingModel = createDoublingModel(config.doubling);
  const tryDoubling = doublingModel.sample;
  const preservePhones = config.writtenFormConstraints?.policy === "preserve-phones";
  if (config.followingLetters && !preservePhones) throw new Error("Following-letter conditioning requires preserve-phones");
  if (sharedRules !== undefined && !preservePhones) throw new Error("Shared spellings require preserve-phones");
  const sharedRuntime = sharedRules === undefined ? undefined : createSharedSpellingRuntime(sharedRules, config);
  const splitPolicy = config.splitVowels;
  if (splitPolicy && !schedule) throw new Error("Split vowels require shared spelling schedule");
  if (splitPolicy) {
    const magicSlots = schedule!.slots("syllable").filter(slot => slot.kind === "regex" && slot.rule.name === "magic-e");
    if (magicSlots.length !== 1) throw new Error("Split vowels require one syllable magic-e slot");
  }
  const splitRuntime = splitPolicy ? createSplitSpellingRuntime(config, splitPolicy.supports, splitPolicy.routes, sharedRules!) : undefined;
  const completionPlanner = splitPolicy ? createCompletionPlanner(config, splitPolicy.supports) : undefined;
  const planCoverage = preservePhones ? createSpellingCoveragePlanner(config, resolveGraphemes, doublingModel, sharedRules) : undefined;
  const normalizer = preservePhones ? createSpellingNormalizer(config, resolveGraphemes, doublingModel, sharedRules) : undefined;

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
        }))
      )
    );

    const baseSpelling = new BaseSpelling(flattenedPhonemes.map((entry, id) => ({
      id, part: "root", syllableIndex: entry.syllableIndex, segment: entry.position,
      segmentIndex: entry.positionIndex, soundAtSpelling: entry.phoneme.sound,
      ...(preservePhones ? { boundary: { phoneme: structuredClone(entry.phoneme), stress: entry.stress } } : {}),
    })), tracing, preservePhones, preservePhones, sharedRules, config, sharedRuntime, splitRuntime, completionPlanner, followingGuard);
    const boundaryContexts = preservePhones ? spellingBoundaryContexts(baseSpelling.current().phones) : undefined;
    const sequence = config.followingLetters ? createSequenceEvidenceSession(createGraphemeSequenceModel(config,
      boundaryContexts!.map(entry => ({ grapheme: entry.slot, doubling: entry.doubling })), config.followingLetters.targets)) : undefined;
    const spellingChoices: SpellingChoiceState[] = [];
    const selectionStates: HistoricalSelectionState[] = [];
    const normalizeCollision = (site: NormalizationSite, rightIndex: number): boolean => {
      const sharedView = sharedRules === undefined ? undefined : baseSpelling.constructionState();
      const input = { ...baseSpelling.current(), ...baseSpelling.normalizationState(), contexts: boundaryContexts!,
        states: selectionStates, site, rightIndex, ...(sharedView ? {
          shared: { constructions: sharedView.constructions, certificates: sharedView.certificates },
        } : {}) };
      const decision = normalizer!.decide(input);
      if (decision.status === "normalized") normalizer!.verify(input, decision.plan);
      baseSpelling.recordNormalization(site, rightIndex, decision);
      return decision.status === "normalized";
    };
    const formSplits = (route: "syllable" | "word", partId: number): void => {
      if (!splitRuntime) return;
      for (const phone of baseSpelling.current().phones) {
        if (phone.segment !== "nucleus" || phone.syllableIndex !== partId) continue;
        baseSpelling.recordSplitAttempt(splitRuntime.planner.decide(baseSpelling.constructionState(), phone.id, route, rand));
      }
    };
    const applySharedPass = (slot: SharedSpellingSlot): string => {
      const surface = () => baseSpelling.current().cells.filter(cell => slot.phase === "word" || cell.partId === slot.partId)
        .map(cell => cell.text).join("");
      const scope = slot.phase === "word" ? "word" : `syllable:${slot.partId}`;
      baseSpelling.recordWriterStep("pass-start", slot);
      for (const entry of sharedPasses[slot.phase]!) {
        baseSpelling.recordWriterStep("slot-start", slot, entry.index);
        const before = surface();
        if (entry.kind === "shared") {
          baseSpelling.scanSharedSlot(slot, entry.ruleId, rand);
          context.trace?.recordRepair(`sharedSpelling:${entry.ruleId}`, before, surface(), scope);
        } else if (splitRuntime && slot.phase === "syllable" && entry.rule.name === "magic-e") {
          formSplits("syllable", slot.partId);
          context.trace?.recordRepair("splitVowel:syllable", before, surface(), scope);
        } else {
          const cells = baseSpelling.current().cells;
          const first = slot.phase === "word" ? 0 : cells.findIndex(cell => cell.partId != null && cell.partId >= slot.partId);
          const start = first < 0 ? cells.length : first;
          applySpellingRules(before, entry.compiled, rand, context.trace, scope,
            baseSpelling.observe(start, slot.partId ?? undefined));
        }
        baseSpelling.recordWriterStep("slot-end", slot, entry.index);
      }
      baseSpelling.recordWriterStep("pass-end", slot);
      return surface();
    };
    context.baseSpelling = baseSpelling;
    const cleanParts: string[] = [];
    const hyphenatedParts: string[] = [];
    const observeParts = baseSpelling.observeParts(cleanParts);
    let currentSyllable: string[] = [];
    let currentSyllableOwners: number[] = [];
    const doublingCtx: DoublingState = { doublingCount: 0 };
    const nucleusGraphemes: string[] = []; // Track nucleus grapheme form per syllable
    let currentNucleusForm = "";
    let prevNucleusForm = "";
    let prevGraphemeForm: string | undefined;

    for (let phonemeIndex = 0; phonemeIndex < flattenedPhonemes.length; phonemeIndex++) {
      const { phoneme, syllableIndex, position, positionIndex, stress } = flattenedPhonemes[phonemeIndex];
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
      const onsetLength = syllables[syllableIndex].onset.length;
      const nucleusLength = syllables[syllableIndex].nucleus.length;
      const codaLength = syllables[syllableIndex].coda.length;

      // Pipeline
      const isLastPhoneme = phonemeIndex === flattenedPhonemes.length - 1;
      const segment = { initial: phonemeIndex === 0, final: isLastPhoneme };
      const graphemeSlot: GraphemeSlot = {
        phoneme, prevPhoneme, nextPhoneme: nextEntry?.phoneme,
        index: phonemeIndex, total: flattenedPhonemes.length, position,
        syllableIndex, syllableCount: syllables.length, onsetLength, nucleusLength, codaLength,
        isCluster, stress,
      };
      if (normalizer) selectionStates.push({ previousForm: prevGraphemeForm ?? null, doublingCount: doublingCtx.doublingCount,
        nucleusForm: currentNucleusForm, previousNucleusForm: prevNucleusForm });
      const { candidates, ordinary, conditioned, positional, weights, positiveCount, fallback, preferenceRelaxed } = resolveGraphemes(
        graphemeSlot, { previousForm: prevGraphemeForm, doublingCount: doublingCtx.doublingCount });
      const conditionedChoice = sequence?.next(rand());
      const selectedSource = conditionedChoice ? config.graphemes[conditionedChoice.choice.inventoryIndex] : undefined;
      if (conditionedChoice && !selectedSource) throw new Error("Conditioned selection lost inventory identity");
      const selected: FrequencyResult = conditionedChoice && selectedSource
        ? { ...selectedSource, _source: selectedSource, _roll: conditionedChoice.roll }
        : selectByFrequency(weights, rand, tracing);
      if (position === "nucleus") currentNucleusForm = selected.form;
      const doublingTraceInfo: DoublingTraceInfo | undefined = context.trace && !sequence ? { attempted: false } : undefined;
      // For doubling, use the nucleus grapheme that the reader sees before the
      // doubled consonant: for coda, that's the current syllable's nucleus; for
      // onset, it's the previous syllable's (the vowel the doubling "closes").
      const doublingSlot: DoublingSlot = {
        form: selected.form,
        phoneme,
        position,
        prevPhoneme,
        nextNucleus,
        nucleusForm: position === "onset" ? prevNucleusForm : currentNucleusForm,
        stress,
        prevReduced,
        isCluster,
        isFirstInCoda: position === "coda" && prevEntry?.position !== "coda",
        isLastPhoneme,
        isEndOfWord,
        isMonosyllabic: syllables.length === 1,
        nextIsConsonant: nextEntry?.position === "onset" || (nextEntry?.syllableIndex === syllableIndex && nextEntry?.position === "coda"),
      };
      const form = conditionedChoice ? conditionedChoice.choice.realized : tryDoubling(doublingSlot, doublingCtx, rand, doublingTraceInfo);
      if (conditionedChoice) doublingCtx.doublingCount += conditionedChoice.choice.doublingIncrement;
      if (preservePhones) {
        spellingChoices.push({
          ...boundaryContexts![phonemeIndex],
          grapheme: selected._source, form,
        });
      }
      prevGraphemeForm = form;

      const choiceStart = baseSpelling.length;
      baseSpelling.appendChoice(phonemeIndex, selected.form, form, preservePhones ? config.graphemes.indexOf(selected._source) : undefined,
        preservePhones ? doublingCtx.doublingCount - selectionStates[phonemeIndex].doublingCount : undefined);
      let emitted = form;
      const adjacentLeft = currentSyllable[currentSyllable.length - 1]?.slice(-1);
      if (normalizer) baseSpelling.recordNormalizationCheck("adjacent-choice", !!adjacentLeft && form.length > 0);
      if (currentSyllable.length > 0 && form.length > 0 && adjacentLeft === form[0]) {
        if (normalizer) {
          if (normalizeCollision("adjacent-choice", choiceStart)) emitted = form.slice(1);
        } else {
          baseSpelling.edit(choiceStart, 1, "", "deduplicateAdjacentLetters");
          emitted = form.slice(1);
        }
      }

      if (context.trace) {
        context.trace.recordGraphemeSelection({
          index: phonemeIndex,
          phoneme: phoneme.sound,
          position,
          syllableIndex,
          candidates: candidates.map(g => g.form),
          afterCondition: conditioned.map(g => g.form),
          afterPosition: positional.map(g => g.form),
          weights: selected._weights ?? [],
          roll: selected._roll ?? 0,
          selected: selected.form,
          emitted,
          doubled: form !== selected.form,
          ...(conditionedChoice ? { conditionedSelection: conditionedChoice } : {}),
          selection: conditionedChoice ? undefined : {
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
          doubling: doublingTraceInfo ? {
            attempted: doublingTraceInfo.attempted,
            reason: doublingTraceInfo.reason,
            probability: doublingTraceInfo.probability,
            result: doublingTraceInfo.result,
          } : undefined,
        });
      }
      currentSyllable.push(emitted);
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
        const syllableStart = cleanParts.reduce((length, part) => length + part.length, 0);
        baseSpelling.setPhase("syllable");
        let syllableStr = schedule ? applySharedPass({ phase: "syllable", partId: syllableIndex })
          : applySpellingRules(rawSyllable, syllableRules, rand, context.trace, `syllable:${syllableIndex}`, baseSpelling.observe(syllableStart, syllableIndex));
        let syllableOwners = tracing
          ? remapOwnersThroughRewrite(rawSyllable, currentSyllableOwners, syllableStr)
          : [];

        const joinLeft = cleanParts[cleanParts.length - 1]?.slice(-1);
        if (normalizer) baseSpelling.recordNormalizationCheck("syllable-join", !!joinLeft && syllableStr.length > 0);
        if (cleanParts.length > 0 && syllableStr.length > 0 && joinLeft === syllableStr[0]) {
          let shortened = true;
          if (normalizer) shortened = normalizeCollision("syllable-join", syllableStart);
          else baseSpelling.edit(syllableStart, 1, "", "deduplicateSyllableJoin");
          if (shortened) {
            syllableStr = syllableStr.slice(1);
            if (tracing) syllableOwners = syllableOwners.slice(1);
          }
        }

        cleanParts.push(syllableStr);
        hyphenatedParts.push(syllableStr);
        nucleusGraphemes.push(currentNucleusForm);
        if (tracing) {
          preRepairSurface += syllableStr;
          preRepairOwners.push(...syllableOwners);
        }

        if (nextEntry) {
          hyphenatedParts.push("&shy;");
        }

        currentSyllable = [];
        prevNucleusForm = currentNucleusForm;
        currentSyllableOwners = [];
        currentNucleusForm = "";
      }
    }

    if (tracing) {
      const cleanSurface = cleanParts.join("");
      if (preRepairSurface !== cleanSurface) {
        preRepairOwners = remapOwnersThroughRewrite(preRepairSurface, preRepairOwners, cleanSurface);
        preRepairSurface = cleanSurface;
      }
    }

    sequence?.finish();
    baseSpelling.setPhase("word");
    // Silent-e: rewrite final VCe patterns (magic-e for long vowels)
    if (splitRuntime) {
      formSplits("word", syllables.length - 1);
      const parts = baseSpelling.projectParts(syllables.length);
      if (!parts) throw new Error("Split formation lost root parts");
      parts.forEach((part, i) => { cleanParts[i] = part; hyphenatedParts[i * 2] = part; });
    } else if (silentELookup && silentEConfig) {
      applySilentE(
        cleanParts, hyphenatedParts, syllables, nucleusGraphemes,
        silentELookup, silentEExcluded, silentEConfig.probability, rand, observeParts,
      );
    }

    // Silent-e: orthographic append for consonants that can't end bare (e.g. 'v')
    if (appendAfterLookup) {
      appendSilentE(cleanParts, hyphenatedParts, syllables, appendAfterLookup, rand, observeParts);
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
            if (observeParts(si, part.length, 0, repair.insert, `orthographicRepair:${repair.name}`) === false) continue;
            cleanParts[si] = part + repair.insert;
            hyphenatedParts[si * 2] = hyphenatedParts[si * 2] + repair.insert;
            break;
          }
        }
      }
    }

    const wfc = config.writtenFormConstraints;
    const invalidJunction = !!planCoverage && syllables.some((syllable, i) => i + 1 < syllables.length &&
        syllable.coda.length > 0 && syllables[i + 1].onset.length > 0 &&
        !validateJunction(syllable.coda, syllables[i + 1].onset, config));
    if (planCoverage) {
      const outcome = planCoverage.apply(baseSpelling, spellingChoices, "base-before-word-rules", invalidJunction);
      context.trace?.recordSpellingBudget(outcome);
      if (outcome.status === "respell") {
        const parts = baseSpelling.projectParts(syllables.length)!;
        parts.forEach((part, i) => { cleanParts[i] = part; hyphenatedParts[i * 2] = part; });
      }
    } else {
    // Consonant pileup repair (grapheme-aware)
      const maxGraphemes = wfc?.maxConsonantGraphemes;
      if (maxGraphemes) {
        const before = context.trace ? cleanParts.join("") : "";
        repairConsonantPileups(cleanParts, hyphenatedParts, maxGraphemes, wfc?.consonantGraphemes, observeParts);
        context.trace?.recordRepair("repairConsonantPileups", before, cleanParts.join(""));
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
        repairJunctions(cleanParts, hyphenatedParts, boundaries, config, wfc?.consonantGraphemes, observeParts);
        if (context.trace) {
          const afterJunction = cleanParts.join("");
          if (afterJunction !== beforeJunction) {
            context.trace.recordRepair("repairJunctions:backstop", beforeJunction, afterJunction);
          }
        }
        // Re-run pileup repair in case junction repair changed things
        if (maxGraphemes) {
          const beforePileup = context.trace ? cleanParts.join("") : "";
          repairConsonantPileups(cleanParts, hyphenatedParts, maxGraphemes, wfc?.consonantGraphemes, observeParts);
          context.trace?.recordRepair("repairConsonantPileups:postJunction", beforePileup, cleanParts.join(""));
        }
      }

      // Raw consonant letter backstop
      if (wfc?.maxConsonantLetters) {
        const before = context.trace ? cleanParts.join("") : "";
        repairConsonantLetters(cleanParts, hyphenatedParts, wfc.maxConsonantLetters, observeParts);
        context.trace?.recordRepair("repairConsonantLetters", before, cleanParts.join(""));
      }

      // Word-final consonant letter limit
      if (wfc?.maxFinalConsonantLetters) {
        const before = context.trace ? cleanParts.join("") : "";
        repairFinalConsonantLetters(cleanParts, hyphenatedParts, wfc.maxFinalConsonantLetters, observeParts);
        context.trace?.recordRepair("repairFinalConsonantLetters", before, cleanParts.join(""));
      }

      // Raw vowel letter backstop
      if (wfc?.maxVowelLetters) {
        const before = context.trace ? cleanParts.join("") : "";
        repairVowelLetters(cleanParts, hyphenatedParts, wfc.maxVowelLetters, observeParts);
        context.trace?.recordRepair("repairVowelLetters", before, cleanParts.join(""));
      }

    }

    // Post-join pass: apply word-scope spelling rules
    let finalClean = schedule ? applySharedPass({ phase: "word", partId: null })
      : applySpellingRules(cleanParts.join(""), wordRules, rand, context.trace, "word", baseSpelling.observe());
    let finalHyphenated = hyphenatedParts.join("");

    if (planCoverage) {
      const outcome = planCoverage.apply(baseSpelling, spellingChoices, "base-after-word-rules", invalidJunction);
      context.trace?.recordSpellingBudget(outcome);
      if (outcome.status === "respell") {
        const parts = baseSpelling.projectParts(syllables.length)!;
        finalClean = parts.join("");
        finalHyphenated = parts.join("&shy;");
      }
    } else {
    // Post-join vowel repair for cross-boundary runs
      if (wfc?.maxVowelLetters) {
        let vResult = "";
        let vowelRun = 0;
        for (let ci = 0; ci < finalClean.length; ci++) {
          if (isVowelChar(finalClean[ci], ci, finalClean)) {
            vowelRun++;
            if (vowelRun <= wfc.maxVowelLetters) vResult += finalClean[ci];
            else baseSpelling.edit(vResult.length, 1, "", "postJoinVowelCap");
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
        const observePost = baseSpelling.observeParts(postParts);
        if (wfc.maxConsonantGraphemes) {
          repairConsonantPileups(postParts, postHyph, wfc.maxConsonantGraphemes, wfc.consonantGraphemes, observePost);
        }
        if (wfc.maxConsonantLetters) {
          repairConsonantLetters(postParts, postHyph, wfc.maxConsonantLetters, observePost);
        }
        if (wfc.maxFinalConsonantLetters) {
          repairFinalConsonantLetters(postParts, postHyph, wfc.maxFinalConsonantLetters, observePost);
        }
        finalClean = postParts[0];
        context.trace?.recordRepair("postSpellingBackstop", beforePost, finalClean);
      }

    }

    if (completionPlanner) {
      baseSpelling.completeVowels(rand);
      finalClean = baseSpelling.current().cells.map(cell => cell.text).join("");
      const parts = baseSpelling.projectParts(syllables.length);
      if (parts) finalHyphenated = parts.join("&shy;");
    }

    if (tracing && context.trace) {
      const finalOwners = remapOwnersThroughRewrite(preRepairSurface, preRepairOwners, finalClean);
      context.trace.orthographyTrace = buildOrthographyTrace(finalClean, finalOwners, traceUnits, context.trace);
    }

    baseSpelling.assertSurface(finalClean);
    if (context.trace) context.trace.baseSpelling = baseSpelling.snapshot();
    written.clean = finalClean;
    written.hyphenated = finalHyphenated;
  };
}
