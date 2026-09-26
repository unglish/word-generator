import type { LanguageConfig } from "../../../../src/config/language.js";
import { createBaseSpellingEvidenceVerifier } from "../../../../src/core/spelling-evidence.js";
import { observeSpelling as observeHistoricalCoverage } from "../spelling-coverage/observe.js";
import { observeHistoricalNormalizationCurrent } from "./observe-historical-current.js";
import type { BaseSpellingTraceV3 } from "../../../../src/core/base-spelling.js";
import type { Word } from "../../../../src/types.js";
import type { SpellingCell } from "../../../../src/core/base-spelling.js";

const capRules = new Set(["repairConsonantPileups", "repairConsonantLetters", "repairFinalConsonantLetters", "repairVowelLetters", "postJoinVowelCap"]);
export type Counts = Record<string, number>;
const increment = (counts: Counts, key: string, amount = 1): void => { counts[key] = (counts[key] ?? 0) + amount; };
const owners = (cell: SpellingCell): number[] => cell.origin.kind === "rewrite" ? cell.origin.sourceUnitIds : [cell.origin.unitId];

function collectV3Coverage(draw: { word: Word }, counts: Counts): void {
  const base = draw.word.trace!.baseSpelling!;
  if (base.version !== 3) throw new Error("V3 coverage observation requires version 3");
  increment(counts, "words"); increment(counts, `ledgerVersion:${base.version}`);
  increment(counts, `legacySelectedAttemptIndex:${draw.word.trace!.attempts}`);
  increment(counts, "phones", base.phones.length); increment(counts, "units", base.units.length);
  increment(counts, "unresolvedCells", base.unresolvedCells);
  if (base.unresolvedCells) increment(counts, "wordsWithUnresolvedCells");
  const remainingIds = new Set(base.cells.map(cell => cell.id));
  const remainingOwners = new Set(base.cells.flatMap(owners));
  const rewritten = new Set(base.cells.filter(cell => cell.origin.kind === "rewrite").flatMap(owners));
  const licensed = new Set(base.cells.filter(cell => cell.origin.kind === "licensed" || cell.origin.kind === "normalized").flatMap(owners));
  const consumingEdit = (id: number) => [...base.edits].reverse().find(edit => edit.input.some(cell => owners(cell).includes(id)));
  for (const unit of base.units) {
    increment(counts, `selectedSpelling:${JSON.stringify([base.phones[unit.phoneIds[0]].soundAtSpelling, unit.selected])}`);
    if (unit.selected === "th") increment(counts, "selectedThUnits");
    if (unit.sourceCellIds.length && !remainingOwners.has(unit.id)) {
      increment(counts, "noSurvivingLineageUnits");
      const rule = consumingEdit(unit.id)?.rule ?? "unavailable";
      increment(counts, `noLineageRule:${rule}`);
      if (capRules.has(rule)) increment(counts, "capNoLineageUnits");
    }
    const surviving = unit.sourceCellIds.filter(id => remainingIds.has(id));
    if (surviving.length && surviving.length < unit.sourceCellIds.length && !rewritten.has(unit.id) && !licensed.has(unit.id)) {
      increment(counts, "partialSourceUnits");
      if (unit.selected === "th" && surviving.length === 1) {
        increment(counts, "partialThUnits");
        const missing = unit.sourceCellIds.find(id => !remainingIds.has(id));
        const rule = base.edits.find(edit => edit.input.some(cell => cell.id === missing))?.rule ?? "unavailable";
        increment(counts, `partialThRule:${rule}`);
        if (capRules.has(rule)) increment(counts, "capPartialThUnits");
      }
    }
  }
  const caps = base.edits.filter(edit => capRules.has(edit.rule));
  increment(counts, "capEdits", caps.length);
  if (caps.length) increment(counts, "capWords");
  increment(counts, "capUnknownInputCells", caps.flatMap(edit => edit.input).filter(cell => cell.origin.kind === "rewrite").length);
  const outcomes = draw.word.trace!.spellingBudgets;
  if (!outcomes) increment(counts, "budgetEpisodesUnavailableWords");
  if (outcomes?.some(outcome => outcome.before.exceeded.length)) increment(counts, "wordsWithOverBudgetEpisode");
  if (outcomes?.some(outcome => outcome.status === "respell")) increment(counts, "wordsWithRespell");
  if (outcomes?.some(outcome => outcome.status === "infeasible")) increment(counts, "wordsWithInfeasibleBudget");
  if (outcomes?.some(outcome => outcome.status === "infeasible" && outcome.reason === "search-budget")) increment(counts, "wordsWithSearchBudgetRefusal");
  for (const outcome of outcomes ?? []) {
    increment(counts, "episodes"); increment(counts, `episodeScope:${outcome.scope}`);
    increment(counts, `episodeStatus:${outcome.status}`);
    increment(counts, `${outcome.scope}:status:${outcome.status}`);
    if (outcome.before.exceeded.length) increment(counts, "overBudgetEpisodes");
    for (const key of outcome.before.exceeded) increment(counts, `implicatedBudget:${key}`);
    increment(counts, "visitedAssignments", outcome.visitedAssignments);
    increment(counts, "eligibleOptionsVisited", outcome.legalOptions);
    increment(counts, "changedUnits", outcome.changedUnits.length);
    increment(counts, "episodeUnresolvedInputCells", outcome.unresolvedCells);
    increment(counts, `${outcome.scope}:unresolvedInputCells`, outcome.unresolvedCells);
    if (outcome.unresolvedCells) increment(counts, `${outcome.scope}:episodesWithUnresolvedInput`);
    for (const phase of ["before", "after"] as const) {
      for (const [key, value] of Object.entries(outcome[phase].values)) increment(counts, `${outcome.scope}:${phase}:${key}:${value}`);
    }
    if (outcome.status === "infeasible") {
      increment(counts, `infeasibleReason:${outcome.reason}`);
      increment(counts, `${outcome.scope}:reason:${outcome.reason}`);
      for (const [reason, amount] of Object.entries(outcome.refusals)) increment(counts, `branchRefusal:${reason}`, amount);
    }
  }
  const certificates = base.certificates ?? [];
  increment(counts, "verifiedCertificates", certificates.length);
  increment(counts, "changedPhoneIdsInCertificates", certificates.reduce((n, certificate) => n + certificate.phoneIds.length, 0));
  for (const certificate of certificates) {
    for (const replacement of certificate.replacements) {
      increment(counts, `licensedSpelling:${JSON.stringify([base.phones[replacement.phoneIds[0]].soundAtSpelling, replacement.before, replacement.after])}`);
    }
    for (const choice of certificate.choices) {
      increment(counts, `replayedPool:${choice.pool}`);
      if (choice.quotaRelaxed) increment(counts, "replayedQuotaRelaxations");
    }
  }
  const surface = draw.word.written.clean.toLowerCase();
  increment(counts, "letters", surface.length);
  increment(counts, `writtenLength:${surface.length}`);
  if (/[bcdfghjklmnpqrstvwxyz]{5}/.test(surface)) increment(counts, "rawFiveConsonantWords");
}



const dedupRules = new Set(["deduplicateAdjacentLetters", "deduplicateSyllableJoin"]);
const normalizationRule = (rule: string): boolean => dedupRules.has(rule) || rule.startsWith("unitNormalization:");

function collectV3Normalization(base: BaseSpellingTraceV3): Counts {
  const counts: Counts = {
    words: 1, phoneUnits: base.units.length, selectedThUnits: 0, selectedThOnsetUnits: 0,
    structuralAdjacentUnitSlots: 0, structuralSyllableBoundarySlots: 0,
    normalizationEpisodesAvailableWords: 1, prospectiveComparisonsAvailableWords: 1,
    normalizationEpisodesUnavailableWords: 0, prospectiveComparisonsUnavailableWords: 0,
    legacyDedupEvents: 0, uncertifiedDedupDeletions: 0, wordsWithLegacyDedup: 0,
    wordsWithUncertifiedDedup: 0, legacyWholeUnitEvents: 0, legacyPartialUnitEvents: 0,
    legacySameUnitEvents: 0, legacySameSoundEvents: 0, legacyDifferentSoundsEvents: 0,
    legacyUnresolvedInputEvents: 0, dedupAttributedNoLineageUnits: 0,
    dedupAttributedPartialSourceUnits: 0, dedupAttributedPartialThUnits: 0,
    wordsWithDedupNoLineage: 0, wordsWithDedupPartialSource: 0, wordsWithDedupPartialTh: 0,
    wordsWithNormalizedOutcome: 0, wordsWithRetainedOutcome: 0,
    wordsWithNormalizationContextCapRefusal: 0, normalizationPhoneMultiplicityViolations: 0,
    emittedNormalizationCertificates: base.normalizationCertificates.length,
    verifiedNormalizationCertificates: base.normalizationCertificates.length,
  };
  const surviving = new Set(base.cells.map(cell => cell.id));
  const lineage = new Set(base.cells.flatMap(owners));
  const replaced = new Set(base.cells.filter(cell => cell.origin.kind !== "selection").flatMap(owners));
  for (const [id, unit] of base.units.entries()) {
    const phone = base.phones[id];
    if (unit.selected === "th") {
      increment(counts, "selectedThUnits");
      if (phone.segment === "onset") increment(counts, "selectedThOnsetUnits");
    }
    if (id && base.phones[id - 1].syllableIndex === phone.syllableIndex) increment(counts, "structuralAdjacentUnitSlots");
    if (!lineage.has(id) && unit.sourceCellIds.length) {
      const last = [...base.edits].reverse().find(edit => edit.input.some(cell => owners(cell).includes(id)));
      if (last && normalizationRule(last.rule)) increment(counts, "dedupAttributedNoLineageUnits");
    }
    const remaining = unit.sourceCellIds.filter(cellId => surviving.has(cellId));
    if (!remaining.length || remaining.length === unit.sourceCellIds.length || replaced.has(id)) continue;
    const missing = new Set(unit.sourceCellIds.filter(cellId => !surviving.has(cellId)));
    if (!base.edits.some(edit => normalizationRule(edit.rule) && edit.input.some(cell => missing.has(cell.id)))) continue;
    increment(counts, "dedupAttributedPartialSourceUnits");
    if (unit.selected === "th" && remaining.length === 1) increment(counts, "dedupAttributedPartialThUnits");
  }
  counts.structuralSyllableBoundarySlots = Math.max(0, new Set(base.phones.map(phone => phone.syllableIndex)).size - 1);
  for (const site of ["adjacent-choice", "syllable-join"] as const) {
    counts[`site:${site}:comparisons`] = base.normalization.comparisons[site];
    counts[`site:${site}:collisions`] = base.normalization.collisions[site];
    increment(counts, "actualSiteComparisons", base.normalization.comparisons[site]);
    increment(counts, "actualCollisions", base.normalization.collisions[site]);
  }
  for (const episode of base.normalization.episodes) {
    increment(counts, "normalizationEpisodes");
    increment(counts, `normalizationStatus:${episode.outcome.status}`);
    increment(counts, `site:${episode.site}:status:${episode.outcome.status}`);
    if (episode.outcome.status === "normalized") counts.wordsWithNormalizedOutcome = 1;
    else {
      counts.wordsWithRetainedOutcome = 1;
      increment(counts, `normalizationRefusal:${episode.outcome.reason}`);
      increment(counts, `site:${episode.site}:refusal:${episode.outcome.reason}`);
    }
  }
  for (const certificate of base.normalizationCertificates) {
    increment(counts, `normalizedSpelling:${JSON.stringify([base.phones[certificate.unitId].soundAtSpelling, certificate.before, certificate.after])}`);
    increment(counts, `normalizationPool:${certificate.support.pool}`);
    if (certificate.support.quotaRelaxed) increment(counts, "normalizationQuotaRelaxations");
  }
  for (const [units, word] of [
    ["dedupAttributedNoLineageUnits", "wordsWithDedupNoLineage"],
    ["dedupAttributedPartialSourceUnits", "wordsWithDedupPartialSource"],
    ["dedupAttributedPartialThUnits", "wordsWithDedupPartialTh"],
  ]) if (counts[units]) counts[word] = 1;
  return counts;
}

/** Explicit version dispatch: old readers receive only actual historical versions. */
export function createCurrentSpellingObserver(config: LanguageConfig) {
  const verify = createBaseSpellingEvidenceVerifier(config);
  return (draw: { word: Word }): Counts => {
    const base = draw.word.trace?.baseSpelling;
    if (!base) throw new Error("Missing base spelling provenance");
    const verification = verify(base);
    const coverage: Counts = {};
    if (base.version === 1 || base.version === 2) {
      observeHistoricalCoverage(draw, coverage);
      return { ...coverage, ...observeHistoricalNormalizationCurrent(base) };
    }
    if (base.version !== 3 || verification.version !== 3) throw new Error("Unsupported current spelling observation");
    collectV3Coverage(draw, coverage);
    const normalization = collectV3Normalization(base);
    if (verification.verifiedNormalizations !== normalization.emittedNormalizationCertificates) throw new Error("Incomplete normalization replay");
    for (const outcome of draw.word.trace!.spellingBudgets ?? []) {
      if (outcome.status !== "infeasible" || outcome.reason !== "normalization-context-unavailable") continue;
      increment(normalization, "normalizationContextCapRefusalEpisodes");
      increment(normalization, `${outcome.scope}:normalizationContextCapRefusalEpisodes`);
      normalization.wordsWithNormalizationContextCapRefusal = 1;
      normalization[`${outcome.scope}:wordsWithNormalizationContextCapRefusal`] = 1;
    }
    return { ...coverage, ...normalization };
  };
}

/** A zero denominator is not a successful replay fraction. */
export function normalizationReplaySummary(counts: Counts): {
  status: "available" | "not-applicable" | "unavailable"; fraction: number | null; emitted: number | null; verified: number | null;
} {
  if (!counts.normalizationEpisodesAvailableWords || counts.normalizationEpisodesUnavailableWords > 0) {
    return { status: "unavailable", fraction: null, emitted: counts.emittedNormalizationCertificates ?? null,
      verified: counts.verifiedNormalizationCertificates ?? null };
  }
  const emitted = counts.emittedNormalizationCertificates ?? 0;
  const verified = counts.verifiedNormalizationCertificates ?? 0;
  return { status: emitted ? "available" : "not-applicable", fraction: emitted ? verified / emitted : null, emitted, verified };
}
