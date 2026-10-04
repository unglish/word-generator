import {
  LEGACY_ENGLISH_IDENTITIES, PHONEME_IDENTITY_CONTRACT, observeCmuToken, projectLegacyArpabet,
  type WordIdentityObservation,
} from "./identity.js";

export interface PhoneTransitionTable {
  counts: Record<string, Record<string, number>>;
  rowTotals: Record<string, number>;
  vocabulary: string[];
  total: number;
}
export interface IdentityStressReference {
  identity: { artifactDigest: string; rawSourceSha256: string; selectedEntryDigest: string };
  entries: number;
  phoneEvents: number;
  native: PhoneTransitionTable;
  base: PhoneTransitionTable;
}
export interface StressEvidence {
  version: "explicit-syllable-marks-v1" | "stress-pattern-surface-v1";
  marks: ("primary" | "secondary" | "unstressed" | "unavailable")[];
  unavailable: string[];
  wordBinding: string;
}
export interface ProjectedScore {
  status: "scored" | "unavailable";
  tokens: (string | null)[];
  unavailable: string[];
  transitions: number;
  bitsPerTransition: number | null;
}
export interface IdentityStressScores {
  model: IdentityStressReference["identity"];
  reference: typeof PHONEME_IDENTITY_CONTRACT.reference;
  evidence: StressEvidence;
  coarse: ProjectedScore;
  native: ProjectedScore;
  matched: boolean;
  losses: ReturnType<typeof projectLegacyArpabet>["items"];
}

const BOUNDARY = "#";
const ALPHA = 0.5;
const identities = new Map(LEGACY_ENGLISH_IDENTITIES.map(entry => [entry.id, entry]));
const baseVocabulary = new Set(LEGACY_ENGLISH_IDENTITIES.map(entry => entry.legacyArpabet));

function require(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`Identity/stress reference: ${message}`);
}
function add(row: Record<string, number>, key: string, count: number): void {
  const next = (row[key] ?? 0) + count;
  require(Number.isSafeInteger(next), "count overflow");
  row[key] = next;
}
function baseToken(token: string): string {
  if (token === BOUNDARY) return token;
  const parsed = observeCmuToken(token);
  require(parsed.status === "parsed", `unsupported native token ${token}`);
  return parsed.base;
}
function validateTable(table: PhoneTransitionTable, native: boolean, expectedTotal: number): void {
  const rows: Record<string, number> = {}, columns: Record<string, number> = {};
  require(Array.isArray(table.vocabulary) && table.vocabulary.length > 1, "empty vocabulary");
  require(new Set(table.vocabulary).size === table.vocabulary.length, "duplicate vocabulary token");
  require(table.vocabulary.includes(BOUNDARY), "missing boundary");
  for (const token of table.vocabulary) {
    require(token === BOUNDARY || (native ? observeCmuToken(token).status === "parsed" : baseVocabulary.has(token)), "invalid vocabulary token");
  }
  for (const [first, row] of Object.entries(table.counts)) {
    require(table.vocabulary.includes(first) && Object.keys(row).length > 0, "invalid or empty row");
    for (const [second, count] of Object.entries(row)) {
      require(table.vocabulary.includes(second), "transition outside vocabulary");
      require(first !== BOUNDARY || second !== BOUNDARY, "boundary-to-boundary edge");
      require(Number.isSafeInteger(count) && count > 0, "counts must be positive safe integers");
      add(rows, first, count); add(columns, second, count);
    }
  }
  require(Object.keys(rows).length === table.vocabulary.length && Object.keys(columns).length === table.vocabulary.length, "incomplete vocabulary accounting");
  require(Object.keys(table.rowTotals).length === table.vocabulary.length, "row-total keys differ");
  for (const token of table.vocabulary) {
    require(rows[token] === table.rowTotals[token] && rows[token] === columns[token], "row/column conservation differs");
  }
  const total = Object.values(rows).reduce((sum, count) => sum + count, 0);
  require(Number.isSafeInteger(total) && total === expectedTotal && table.total === total, "event total differs");
}
function validateReference(reference: IdentityStressReference): void {
  for (const value of Object.values(reference.identity)) require(/^[a-f0-9]{64}$/.test(value), "invalid identity digest");
  require(JSON.stringify(Object.keys(reference.identity).sort()) === JSON.stringify(["artifactDigest", "rawSourceSha256", "selectedEntryDigest"]), "identity fields differ");
  require(Number.isSafeInteger(reference.entries) && reference.entries > 0, "invalid entry count");
  require(Number.isSafeInteger(reference.phoneEvents) && reference.phoneEvents >= reference.entries, "invalid phone count");
  const total = reference.phoneEvents + reference.entries;
  validateTable(reference.native, true, total); validateTable(reference.base, false, total);
  require(reference.native.rowTotals[BOUNDARY] === reference.entries, "boundary entry count differs");
  const collapsed: Record<string, Record<string, number>> = {};
  for (const [first, row] of Object.entries(reference.native.counts)) {
    for (const [second, count] of Object.entries(row)) add(collapsed[baseToken(first)] ??= {}, baseToken(second), count);
  }
  const expectedKeys = Object.keys(collapsed).sort(), actualKeys = Object.keys(reference.base.counts).sort();
  require(JSON.stringify(expectedKeys) === JSON.stringify(actualKeys), "native/base row sets differ");
  for (const first of expectedKeys) {
    const expected = collapsed[first], actual = reference.base.counts[first];
    require(JSON.stringify(Object.keys(expected).sort()) === JSON.stringify(Object.keys(actual).sort()), "native/base column sets differ");
    for (const second of Object.keys(expected)) require(expected[second] === actual[second], "native/base pair counts differ");
  }
}
function compile(table: PhoneTransitionTable): Map<string, Map<string, number>> {
  return new Map(table.vocabulary.map(first => [first, new Map(table.vocabulary.map(second => [second,
    -Math.log2(((table.counts[first]?.[second] ?? 0) + ALPHA) / (table.rowTotals[first] + ALPHA * table.vocabulary.length)),
  ]))]));
}
function wordBinding(observation: WordIdentityObservation): string {
  return JSON.stringify({ contractVersion: observation.contractVersion, sourceProfile: observation.sourceProfile, layer: observation.layer,
    syllables: observation.syllables, segments: observation.segments.map(segment => ({ coordinates: segment.coordinates, rawSound: segment.rawSound, baseSound: segment.baseSound, identity: segment.identity })) });
}
function explicitMark(mark: WordIdentityObservation["syllables"][number]["stress"]["mark"]): StressEvidence["marks"][number] {
  return mark === "primary" || mark === "secondary" ? mark : "unavailable";
}
function explicitEvidence(observation: WordIdentityObservation): StressEvidence {
  const marks = observation.syllables.map(syllable => explicitMark(syllable.stress.mark));
  return { version: "explicit-syllable-marks-v1", marks, unavailable: marks.flatMap((mark, index) => mark === "unavailable" ? [`stress:${index}`] : []), wordBinding: wordBinding(observation) };
}
function supportedEvidence(observation: WordIdentityObservation, supplied?: StressEvidence): StressEvidence {
  const evidence = structuredClone(supplied ?? explicitEvidence(observation));
  const versionSupported = evidence.version === "explicit-syllable-marks-v1" || evidence.version === "stress-pattern-surface-v1";
  const marksSupported = evidence.marks.every((mark, index) => {
    const actual = observation.syllables[index]?.stress.mark;
    if (actual === "invalid") return mark === "unavailable";
    if (actual === "primary" || actual === "secondary") return mark === actual || mark === "unavailable";
    return mark === "unavailable" || (evidence.version === "stress-pattern-surface-v1" && mark === "unstressed");
  });
  if (!versionSupported || !marksSupported || evidence.marks.length !== observation.syllables.length || evidence.wordBinding !== wordBinding(observation)) {
    evidence.marks = observation.syllables.map(() => "unavailable");
    evidence.unavailable.push("stress-evidence-word-mismatch");
  }
  return evidence;
}

function structureSupported(observation: WordIdentityObservation): boolean {
  if (observation.syllables.length === 0) return false;
  let cursor = 0;
  for (const [syllable, geometry] of observation.syllables.entries()) {
    if (!Number.isSafeInteger(geometry.nucleusSize) || geometry.nucleusSize < 1) return false;
    for (const slot of ["onset", "nucleus", "coda"] as const) {
      let index = 0;
      while (cursor < observation.segments.length) {
        const coordinates = observation.segments[cursor].coordinates;
        if (coordinates.syllable !== syllable || coordinates.slot !== slot) break;
        if (coordinates.index !== index++) return false;
        cursor++;
      }
      if (slot === "nucleus" && index !== geometry.nucleusSize) return false;
    }
  }
  return cursor === observation.segments.length;
}
function nativeStressDigit(mark: StressEvidence["marks"][number]): string | null {
  switch (mark) {
  case "primary": return "1";
  case "secondary": return "2";
  case "unstressed": return "0";
  default: return null;
  }
}
function nativeTokens(observation: WordIdentityObservation, evidence: StressEvidence): (string | null)[] {
  const sourceSupported = structureSupported(observation) && observation.contractVersion === PHONEME_IDENTITY_CONTRACT.version && observation.sourceProfile === "english-legacy-v1" && observation.layer === "surface";
  return observation.segments.map(segment => {
    const identity = segment.identity.id === null ? undefined : identities.get(segment.identity.id);
    if (!sourceSupported || segment.identity.status !== "resolved" || !identity || identity.sound !== segment.baseSound || identity.kind !== segment.identity.kind || !segment.slotCompatible) return null;
    if (segment.coordinates.slot !== "nucleus") return identity.kind === "consonant" ? identity.legacyArpabet : null;
    if (identity.kind !== "vowel") return null;
    const mark = evidence.marks[segment.coordinates.syllable];
    const digit = nativeStressDigit(mark);
    return digit === null ? null : identity.legacyArpabet + digit;
  });
}
function score(tokens: (string | null)[], compiled: Map<string, Map<string, number>>, unavailable: string[]): ProjectedScore {
  const reasons = [...unavailable];
  if (!tokens.length) reasons.push("empty-word");
  tokens.forEach((token, index) => {
    if (token === null) reasons.push(`projection:${index}`);
    else if (token === BOUNDARY || !compiled.has(token)) reasons.push(`reference:${index}`);
  });
  if (reasons.length) return { status: "unavailable", tokens: [...tokens], unavailable: [...new Set(reasons)], transitions: 0, bitsPerTransition: null };
  const sequence = [BOUNDARY, ...tokens as string[], BOUNDARY];
  let bits = 0;
  for (let index = 1; index < sequence.length; index++) bits += compiled.get(sequence[index - 1])!.get(sequence[index])!;
  return { status: "scored", tokens: [...tokens], unavailable: [], transitions: sequence.length - 1, bitsPerTransition: bits / (sequence.length - 1) };
}

/** New diagnostic only; neither alphabet nor numeric scale is an English-quality verdict. */
export function createIdentityStressScorer(reference: IdentityStressReference): {
  score(observation: WordIdentityObservation, evidence?: StressEvidence): IdentityStressScores;
} {
  validateReference(reference);
  const identity = structuredClone(reference.identity), coarseModel = compile(reference.base), nativeModel = compile(reference.native);
  return { score(observation, suppliedEvidence) {
    const evidence = supportedEvidence(observation, suppliedEvidence);
    const projection = projectLegacyArpabet(observation);
    const coarse = score(projection.items.map(item => item.token), coarseModel, []);
    const native = score(nativeTokens(observation, evidence), nativeModel, evidence.unavailable);
    return { model: structuredClone(identity), reference: PHONEME_IDENTITY_CONTRACT.reference, evidence,
      coarse, native, matched: coarse.status === "scored" && native.status === "scored", losses: projection.items };
  } };
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function unavailableEvidence(observation: WordIdentityObservation, reason: string): StressEvidence {
  return { version: "stress-pattern-surface-v1", marks: observation.syllables.map(() => "unavailable"), unavailable: [reason], wordBinding: wordBinding(observation) };
}
function surfaceStressMismatch(supplied: WordIdentityObservation["syllables"][number]["stress"]["mark"], mark: string): boolean {
  return supplied === "invalid" ||
    supplied === "primary" && mark !== "primary" ||
    supplied === "secondary" && mark !== "secondary" ||
    supplied === "unmarked" && mark !== "unmarked";
}

/** Uses observed final-word marks only after the complete segmented snapshot matches. */
export function observeSurfaceStressEvidence(observation: WordIdentityObservation, trace: unknown): StressEvidence {
  const unavailable = (reason: string) => unavailableEvidence(observation, reason);
  if (!record(trace) || !record(trace.stressPattern)) return unavailable("missing-stress-pattern");
  const pattern = trace.stressPattern;
  if (pattern.version !== 1 && pattern.version !== 2) return unavailable("unsupported-stress-pattern-version");
  if (!Array.isArray(pattern.snapshots)) return unavailable("missing-snapshots");
  const snapshots = pattern.snapshots.filter(snapshot => record(snapshot) && snapshot.domain === "surface-after-realization");
  if (snapshots.length !== 1) return unavailable("missing-or-duplicate-surface-snapshot");
  const surface = snapshots[0] as Record<string, unknown>;
  if (surface.coordinates !== "word" || !Number.isSafeInteger(surface.eventCount) || Number(surface.eventCount) < 0 || !Array.isArray(surface.syllables) || surface.syllables.length !== observation.syllables.length) return unavailable("surface-coordinate-mismatch");
  const marks: StressEvidence["marks"] = [];
  for (let si = 0; si < surface.syllables.length; si++) {
    const syllable = surface.syllables[si];
    if (!record(syllable) || typeof syllable.mark !== "string" || !["primary", "secondary", "unmarked"].includes(syllable.mark)) return unavailable("invalid-surface-mark");
    const supplied = observation.syllables[si].stress.mark;
    if (surfaceStressMismatch(supplied, syllable.mark)) return unavailable("surface-stress-mismatch");
    for (const slot of ["onset", "nucleus", "coda"] as const) {
      const phones = syllable[slot];
      const observed = observation.segments.filter(segment => segment.coordinates.syllable === si && segment.coordinates.slot === slot);
      if (!Array.isArray(phones) || phones.length !== observed.length || (slot === "nucleus" && (phones.length === 0 || phones.length !== observation.syllables[si].nucleusSize))) return unavailable("surface-phone-count-mismatch");
      if (phones.some((phone, index) => !record(phone) || phone.sound !== observed[index].rawSound || observed[index].coordinates.index !== index)) return unavailable("surface-phone-mismatch");
    }
    marks.push(syllable.mark === "unmarked" ? "unstressed" : syllable.mark as "primary" | "secondary");
  }
  return { version: "stress-pattern-surface-v1", marks, unavailable: [], wordBinding: wordBinding(observation) };
}
