import assert from "node:assert/strict";
import type { Word } from "../../../../src/types.js";
import { analyzeStressPattern } from "../../../../src/core/stress-pattern.js";
import type { StressMark, StressPatternDomain, StressOrigin, StressPatternTrace } from "../../../../src/core/stress-pattern.js";
import { domains, mark, oneStage, validatePattern } from "./validate.js";

const increment = (counts: Record<string, number>, key: string, by = 1): void => { counts[key] = (counts[key] ?? 0) + by; };
interface DomainObservation {
  observedWords: number;
  unavailableWords: number;
  quantityObservedWords: number;
  quantityUnavailableWords: number;
  syllables: number;
  primary: number;
  secondary: number;
  patterns: Record<string, number>;
  adjacencies: Record<string, number>;
  unmarkedRuns: Record<string, number>;
  secondaryDistances: Record<string, number>;
  boundaryAdjacencies: Record<string, number>;
  originAdjacencies: Record<string, number>;
  declaredNuclei: Record<string, number>;
}
const historicalStages: Partial<Record<StressPatternDomain, { stage: string; side: "before" | "after" }>> = {
  "root-before-primary": { stage: "applyStress", side: "before" },
  "root-after-rhythmic": { stage: "applyStress", side: "after" },
  "assembled-after-morphology": { stage: "assembleMorphology", side: "after" },
  "final-lexical-before-realization": { stage: "generatePronunciation", side: "before" },
  "surface-after-realization": { stage: "generatePronunciation", side: "after" },
};
export function emptyObservation() {
  return {
    words: 0, originsAvailableWords: 0, originsUnavailableWords: 0, assignmentEvents: 0,
    stressDrawsAvailableWords: 0, stressDrawsUnavailableWords: 0, primaryDraws: 0, explicitDraws: 0, rhythmicDraws: 0,
    causes: {} as Record<string, number>, morphologyStatus: {} as Record<string, number>, rhythmicOutcomes: {} as Record<string, number>,
    rootQuantity: {} as Record<string, number>, rootOperational: {} as Record<string, number>,
    domains: Object.fromEntries(domains.map(domain => [domain, {
      observedWords: 0, unavailableWords: 0, quantityObservedWords: 0, quantityUnavailableWords: 0, syllables: 0, primary: 0, secondary: 0,
      patterns: {}, adjacencies: {}, unmarkedRuns: {}, secondaryDistances: {}, boundaryAdjacencies: {}, originAdjacencies: {}, declaredNuclei: {},
    }])) as Record<StressPatternDomain, DomainObservation>,
  };
}
export type Observation = ReturnType<typeof emptyObservation>;
function originPath(origin: StressOrigin, pattern: StressPatternTrace): string {
  if (origin.kind !== "event") return origin.kind;
  const event = pattern.events[origin.eventId];
  const cause = event.cause.kind === "morphology" ? `${pattern.morphology[event.cause.effectId].role}:${event.cause.action}` : event.cause.kind;
  return `${originPath(event.previousOrigin, pattern)}>${cause}`;
}

/** Historical availability is specific to this pinned detached control, not arbitrary older schemas. */
export function observe(word: Word, mode: "control" | "candidate", results: Observation | Observation[]): void {
  assert.ok(word.trace?.stressWeight && word.lexical);
  if (mode === "candidate") validatePattern(word);
  else assert.equal(word.trace.stressPattern, undefined);
  const pattern = word.trace.stressPattern;
  for (const result of Array.isArray(results) ? results : [results]) {
    result.words++;
    if (pattern) {
      result.originsAvailableWords++;
      result.stressDrawsAvailableWords++;
      result.assignmentEvents += pattern.events.length;
      result.primaryDraws += pattern.primary.draws.length;
      result.explicitDraws += Number(pattern.explicitSecondary.selectionDraw !== null) + Number(pattern.explicitSecondary.gateDraw !== null);
      for (const event of pattern.events) increment(result.causes, event.cause.kind === "morphology" ? `${pattern.morphology[event.cause.effectId].role}:${event.cause.action}` : event.cause.kind);
      for (const effect of pattern.morphology) increment(result.morphologyStatus, `${effect.role}:${effect.effect}:${effect.status}`);
      for (const iteration of pattern.rhythmic.iterations) {
        result.rhythmicDraws += Number(iteration.draw !== null);
        increment(result.rhythmicOutcomes, iteration.skipped ?? (iteration.applied ? "applied" : "gate-failed"));
      }
    } else {
      result.originsUnavailableWords++;
      result.stressDrawsUnavailableWords++;
    }
    for (const syllable of word.trace.stressWeight.syllables) {
      increment(result.rootOperational, `${syllable.operational.weight}:${syllable.operational.basis}`);
      for (const phone of syllable.nucleus) increment(result.rootQuantity, phone.quantity.status === "known" ? `known:${phone.quantity.moras}` : `unknown:${phone.quantity.reason}`);
    }
    for (const domain of domains) {
      const counts = result.domains[domain];
      const snapshot = pattern?.snapshots.find(snapshot => snapshot.domain === domain);
      if (snapshot) counts.quantityObservedWords++;
      else counts.quantityUnavailableWords++;
      let labels: StressMark[];
      if (snapshot) labels = snapshot.syllables.map(syllable => syllable.mark);
      else {
        const historical = historicalStages[domain];
        if (!historical) { counts.unavailableWords++; continue; }
        labels = oneStage(word, historical.stage)[historical.side].map(syllable => mark(syllable.stress));
      }
      const analysis = analyzeStressPattern({ availability: "observed", marks: labels });
      assert.equal(analysis.availability, "observed");
      if (analysis.availability !== "observed") throw new Error("Unexpected unavailable analysis");
      counts.observedWords++;
      counts.syllables += analysis.syllables;
      counts.primary += analysis.primaryIndices.length;
      counts.secondary += analysis.secondaryIndices.length;
      increment(counts.patterns, labels.map(label => ({ primary: "P", secondary: "S", unmarked: "U" }[label])).join(""));
      for (const run of analysis.unmarkedRuns) increment(counts.unmarkedRuns, `${run.position}:${run.length}`);
      for (const secondary of analysis.secondaryDistances) {
        if (!secondary.primaries.length) increment(counts.secondaryDistances, "no-primary");
        for (const primary of secondary.primaries) increment(counts.secondaryDistances, `${secondary.primaries.length}-primary:${primary.signedDistance}`);
      }
      for (const pair of analysis.adjacencies) {
        const kind = `${pair.left}:${pair.right}`;
        increment(counts.adjacencies, kind);
        let boundary = "within-root";
        if (!domain.startsWith("root-")) {
          const start = word.lexical.rootSyllableStart, end = start + word.lexical.root.length;
          boundary = pair.leftIndex + 1 === start ? "prefix-root" : pair.leftIndex + 1 === end ? "root-suffix" : "within-domain";
          increment(counts.boundaryAdjacencies, `${boundary}:${kind}`);
        }
        if (snapshot && pattern) increment(counts.originAdjacencies, `${boundary}:${originPath(snapshot.syllables[pair.leftIndex].origin, pattern)}|${originPath(snapshot.syllables[pair.leftIndex + 1].origin, pattern)}:${kind}`);
      }
      if (snapshot) for (const syllable of snapshot.syllables) for (const phone of syllable.nucleus) increment(counts.declaredNuclei, phone.nuclearQuantity ? `${phone.nuclearQuantity.analysis}:${phone.nuclearQuantity.moras}` : "unspecified");
    }
  }
}

export function reconcile(result: Observation): void {
  assert.equal(result.originsAvailableWords + result.originsUnavailableWords, result.words);
  assert.equal(result.stressDrawsAvailableWords + result.stressDrawsUnavailableWords, result.words);
  assert.equal(Object.values(result.causes).reduce((sum, count) => sum + count, 0), result.assignmentEvents);
  for (const counts of Object.values(result.domains)) {
    assert.equal(counts.observedWords + counts.unavailableWords, result.words);
    assert.equal(counts.quantityObservedWords + counts.quantityUnavailableWords, result.words);
    assert.equal(Object.values(counts.patterns).reduce((sum, count) => sum + count, 0), counts.observedWords);
    assert.equal(Object.entries(counts.patterns).reduce((sum, [pattern, count]) => sum + pattern.length * count, 0), counts.syllables);
    assert.equal(Object.entries(counts.patterns).reduce((sum, [pattern, count]) => sum + [...pattern].filter(label => label === "P").length * count, 0), counts.primary);
    assert.equal(Object.entries(counts.patterns).reduce((sum, [pattern, count]) => sum + [...pattern].filter(label => label === "S").length * count, 0), counts.secondary);
  }
}


export function morphologyStratum(word: Word): string {
  const realization = word.trace?.morphology?.realization;
  const morphology = realization?.prefix ? realization.suffix ? "both" : "prefixed" : realization?.suffix ? "suffixed" : "bare";
  return `${morphology}:${word.syllables.length}`;
}

/** Every numeric count, including conditional histograms, must sum exactly to the stream total. */
export function reconcileStrata(total: Observation, strata: Observation[]): void {
  for (const stratum of strata) reconcile(stratum);
  function sum(target: Record<string, unknown>, sources: Record<string, unknown>[]): void {
    const keys = new Set([...Object.keys(target), ...sources.flatMap(source => Object.keys(source))]);
    for (const key of keys) {
      const sample = target[key] ?? sources.find(source => source[key] !== undefined)?.[key];
      if (typeof sample === "number") assert.equal(target[key] ?? 0, sources.reduce((value, source) => value + Number(source[key] ?? 0), 0), `Stratum count mismatch: ${key}`);
      else sum((target[key] ?? {}) as Record<string, unknown>, sources.map(source => (source[key] ?? {}) as Record<string, unknown>));
    }
  }
  sum(total as unknown as Record<string, unknown>, strata as unknown as Record<string, unknown>[]);
}
