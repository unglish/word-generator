import type { Grapheme, GraphemeCondition, Phoneme } from "../types.js";
import type { LanguageConfig } from "../config/language.js";

/** Fixed phone/structure context at the spelling-selection boundary. */
export interface GraphemeSlot {
  phoneme: Phoneme;
  prevPhoneme?: Phoneme;
  nextPhoneme?: Phoneme;
  index: number;
  total: number;
  position: "onset" | "nucleus" | "coda";
  syllableIndex: number;
  syllableCount: number;
  onsetLength: number;
  nucleusLength: number;
  codaLength: number;
  isCluster: boolean;
  stress?: string;
}

/** Choice state precedes duplicate cleanup and generic spelling rewrites. */
export interface GraphemePrefixState {
  previousForm?: string;
  doublingCount: number;
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
  segmentPosition?: ("initial" | "medial" | "final")[];
  syllableShape?: GraphemeCondition["syllableShape"];
}

function mergeSyllableShape(
  aliasShape: GraphemeCondition["syllableShape"],
  explicitShape: GraphemeCondition["syllableShape"],
): GraphemeCondition["syllableShape"] {
  if (!aliasShape && !explicitShape) return undefined;
  return {
    ...(aliasShape ?? {}),
    ...(explicitShape ?? {}),
  };
}

/**
 * Resolve an alias-backed grapheme condition into a plain condition object.
 * Explicit grapheme condition fields override alias-provided defaults.
 */
export function normalizeGraphemeCondition(
  condition: GraphemeCondition | undefined,
  aliases: LanguageConfig["graphemeConditionAliases"] | undefined,
  graphemeForm?: string,
): Omit<GraphemeCondition, "alias"> | undefined {
  if (!condition) return undefined;
  let aliasCondition: Omit<GraphemeCondition, "alias"> | undefined;
  if (condition.alias) {
    aliasCondition = aliases?.[condition.alias];
    if (!aliasCondition) {
      const suffix = graphemeForm ? ` for grapheme "${graphemeForm}"` : "";
      throw new Error(`Unknown grapheme condition alias "${condition.alias}"${suffix}`);
    }
  }

  const { alias, syllableShape: explicitSyllableShape, ...explicitFields } = condition;
  void alias;
  const merged: Omit<GraphemeCondition, "alias"> = {
    ...(aliasCondition ?? {}),
    ...explicitFields,
  };
  merged.syllableShape = mergeSyllableShape(aliasCondition?.syllableShape, explicitSyllableShape);
  if (!merged.syllableShape) delete merged.syllableShape;
  return merged;
}

function preExpandConditions(
  graphemes: Grapheme[],
  categories: Map<string, Set<string>>,
  aliases: LanguageConfig["graphemeConditionAliases"] | undefined,
): Map<Grapheme, PreExpandedCondition> {
  const result = new Map<Grapheme, PreExpandedCondition>();
  for (const g of graphemes) {
    const normalized = normalizeGraphemeCondition(g.condition, aliases, g.form);
    if (!normalized) continue;
    const expanded: PreExpandedCondition = {};
    if (normalized.leftContext) expanded.leftContext = expandContext(normalized.leftContext, categories);
    if (normalized.rightContext) expanded.rightContext = expandContext(normalized.rightContext, categories);
    if (normalized.notLeftContext) expanded.notLeftContext = expandContext(normalized.notLeftContext, categories);
    if (normalized.notRightContext) expanded.notRightContext = expandContext(normalized.notRightContext, categories);
    if (normalized.leftGraphemeContext) expanded.leftGraphemeContext = new Set(normalized.leftGraphemeContext);
    if (normalized.notLeftGraphemeContext) expanded.notLeftGraphemeContext = new Set(normalized.notLeftGraphemeContext);
    if (normalized.wordPosition) expanded.wordPosition = normalized.wordPosition;
    if (normalized.segmentPosition) expanded.segmentPosition = normalized.segmentPosition;
    if (normalized.syllableShape) expanded.syllableShape = normalized.syllableShape;
    result.set(g, expanded);
  }
  return result;
}

function checkClusterShapeRequirement(length: number, requirement: "empty" | "nonEmpty" | "any" | undefined): boolean {
  if (!requirement || requirement === "any") return true;
  if (requirement === "empty") return length === 0;
  return length > 0;
}

function checkNucleusLengthRequirement(
  length: number,
  requirement: NonNullable<GraphemeCondition["syllableShape"]>["nucleusLength"],
): boolean {
  if (requirement === undefined) return true;
  if (typeof requirement === "number") return length === requirement;
  if (requirement.min !== undefined && length < requirement.min) return false;
  if (requirement.max !== undefined && length > requirement.max) return false;
  return true;
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
  onsetLength?: number,
  nucleusLength?: number,
  codaLength?: number,
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

  if (condition.segmentPosition) {
    const initial = phonemeIndex === 0;
    const final = phonemeIndex === totalPhonemes - 1;
    if (!condition.segmentPosition.some(position =>
      (position === "initial" && initial) ||
      (position === "final" && final) ||
      (position === "medial" && !initial && !final)
    )) return false;
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

  if (condition.syllableShape) {
    if (!checkClusterShapeRequirement(onsetLength ?? 0, condition.syllableShape.onset)) return false;
    if (!checkClusterShapeRequirement(codaLength ?? 0, condition.syllableShape.coda)) return false;
    if (!checkNucleusLengthRequirement(nucleusLength ?? 0, condition.syllableShape.nucleusLength)) return false;
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
  onsetLength?: number,
  nucleusLength?: number,
  codaLength?: number,
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
      onsetLength,
      nucleusLength,
      codaLength,
    )
  );
  return filtered;
}

// ---------------------------------------------------------------------------
// Pipeline Step 3: Filter by position
// ---------------------------------------------------------------------------

interface SegmentPosition {
  initial: boolean;
  final: boolean;
}

export function positionLabel(initial: boolean, final: boolean): "initial" | "medial" | "final" | "isolated" {
  if (initial && final) return "isolated";
  if (initial) return "initial";
  return final ? "final" : "medial";
}

function positionWeight(
  grapheme: Grapheme,
  firstSyllable: boolean,
  lastSyllable: boolean,
  segment?: SegmentPosition,
): number {
  const atSegment = grapheme.positionScope === "segment" && segment;
  const initial = atSegment ? atSegment.initial : firstSyllable;
  const final = atSegment ? atSegment.final : lastSyllable;
  if (initial && final) {
    if (!atSegment && grapheme.isolatedSyllableWeight !== undefined) return grapheme.isolatedSyllableWeight;
    // Legacy custom configurations must satisfy both edge exclusions.
    return Math.min(grapheme.startWord ?? 1, grapheme.endWord ?? 1);
  }
  if (initial) return grapheme.startWord ?? 1;
  return final ? (grapheme.endWord ?? 1) : (grapheme.midWord ?? 1);
}

export function filterByPosition(
  candidates: Grapheme[],
  isCluster: boolean,
  firstSyllable: boolean,
  lastSyllable: boolean,
  segment?: SegmentPosition,
): Grapheme[] {
  return candidates.filter(grapheme =>
    (!isCluster || grapheme.cluster === undefined || grapheme.cluster > 0) &&
    positionWeight(grapheme, firstSyllable, lastSyllable, segment) > 0
  );
}

function frequencyWeight(
  grapheme: Grapheme,
  firstSyllable: boolean,
  lastSyllable: boolean,
  segment: SegmentPosition,
  position: "onset" | "nucleus" | "coda",
  stress: string | undefined,
  syllableCount: number,
): number {
  let modifier = 1;
  if (stress !== "ˈ" && syllableCount >= 2 && grapheme.form.length > 1) {
    modifier = position === "nucleus"
      ? Math.max(0.02, 0.15 / syllableCount)
      : Math.max(0.15, 0.5 / syllableCount);
  }
  return grapheme.frequency * positionWeight(grapheme, firstSyllable, lastSyllable, segment) * modifier;
}

type GraphemeFallbackReason = "no-conditioned-candidates" | "no-positional-candidates" | "no-positive-weights";

function fallbackReason(conditionedCount: number, positionalCount: number): GraphemeFallbackReason {
  if (conditionedCount === 0) return "no-conditioned-candidates";
  if (positionalCount === 0) return "no-positional-candidates";
  return "no-positive-weights";
}

export class NoLegalGraphemeError extends Error {}

/** One hard-legality and soft-quota policy, shared by selection and respelling. */
export function createGraphemeResolver(config: LanguageConfig) {
  const graphemeMaps = config.graphemeMaps;
  const doubling = config.doubling;
  for (const grapheme of config.graphemes) {
    const weights = [grapheme.frequency, grapheme.startWord, grapheme.midWord, grapheme.endWord,
      grapheme.onset, grapheme.nucleus, grapheme.coda, grapheme.cluster, grapheme.isolatedSyllableWeight];
    if (weights.some(weight => weight !== undefined && (!Number.isFinite(weight) || weight < 0))) {
      throw new Error(`Invalid grapheme weight for /${grapheme.phoneme}/ → ${grapheme.form}`);
    }
  }
  const expanded = preExpandConditions(config.graphemes, buildCategorySets(config.phonemes), config.graphemeConditionAliases);
  const doubledForms = new Set(Object.values(doubling?.doubledForms ?? {}));
  return (slot: GraphemeSlot, prefix: GraphemePrefixState) => {
    const firstSyllable = slot.syllableIndex === 0;
    const lastSyllable = slot.syllableIndex === slot.syllableCount - 1;
    const segment = { initial: slot.index === 0, final: slot.index === slot.total - 1 };
    const candidates = getGraphemeCandidates(graphemeMaps, slot.phoneme.sound, slot.position);
    const ordinary = candidates.filter(grapheme => !grapheme.fallbackOnly);
    const conditionCandidates = (pool: Grapheme[]): Grapheme[] => filterByCondition(
      pool, expanded, slot.prevPhoneme, slot.nextPhoneme, slot.index, slot.total,
      firstSyllable, lastSyllable, prefix.previousForm,
      slot.onsetLength, slot.nucleusLength, slot.codaLength,
    );
    const positionCandidates = (pool: Grapheme[]): Grapheme[] =>
      filterByPosition(pool, slot.isCluster, firstSyllable, lastSyllable, segment);
    const positiveWeights = (pool: Grapheme[]): [Grapheme, number][] => pool
      .map((grapheme): [Grapheme, number] => [grapheme, frequencyWeight(
        grapheme, firstSyllable, lastSyllable, segment, slot.position, slot.stress, slot.syllableCount,
      )])
      .filter(([, weight]) => weight > 0 && Number.isFinite(weight));
    const conditioned = conditionCandidates(ordinary);
    const positional = positionCandidates(conditioned);
    let weights = positiveWeights(positional);
    const positiveCount = weights.length;
    let fallback: GraphemeFallbackReason | undefined;
    if (weights.length === 0) {
      fallback = fallbackReason(conditioned.length, positional.length);
      weights = positiveWeights(positionCandidates(conditionCandidates(
        candidates.filter(grapheme => grapheme.fallbackOnly),
      )));
      if (weights.length === 0) {
        throw new NoLegalGraphemeError(`No legal grapheme for /${slot.phoneme.sound}/ at segment ${slot.index} ` +
          `(${slot.position}, syllable ${slot.syllableIndex}; ${fallback})`);
      }
    }
    const quotaFull = doubledForms.size > 0 && prefix.doublingCount >= (doubling?.maxPerWord ?? Infinity);
    const quotaWeights = quotaFull ? weights.filter(([g]) => !doubledForms.has(g.form)) : weights;
    const preferenceRelaxed = quotaWeights.length === 0 ? "doubling-quota" as const : undefined;
    return {
      candidates, ordinary, conditioned, positional, positiveCount, fallback, preferenceRelaxed,
      weights: quotaWeights.length > 0 ? quotaWeights : weights,
    };
  };
}
