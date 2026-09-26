import type { Word } from "../../../../src/types.js";
import type { SpellingCell } from "../../../../src/core/base-spelling.js";

const capRules = new Set(["repairConsonantPileups", "repairConsonantLetters", "repairFinalConsonantLetters", "repairVowelLetters", "postJoinVowelCap"]);
export type Counts = Record<string, number>;
const increment = (counts: Counts, key: string, amount = 1): void => { counts[key] = (counts[key] ?? 0) + amount; };
const owners = (cell: SpellingCell): number[] => cell.origin.kind === "rewrite" ? cell.origin.sourceUnitIds : [cell.origin.unitId];

export function observeSpelling(draw: { word: Word }, counts: Counts): void {
  const base = draw.word.trace!.baseSpelling!;
  increment(counts, "words"); increment(counts, `ledgerVersion:${base.version}`);
  increment(counts, `legacySelectedAttemptIndex:${draw.word.trace!.attempts}`);
  increment(counts, "phones", base.phones.length); increment(counts, "units", base.units.length);
  increment(counts, "unresolvedCells", base.unresolvedCells);
  if (base.unresolvedCells) increment(counts, "wordsWithUnresolvedCells");
  const remainingIds = new Set(base.cells.map(cell => cell.id));
  const remainingOwners = new Set(base.cells.flatMap(owners));
  const rewritten = new Set(base.cells.filter(cell => cell.origin.kind === "rewrite").flatMap(owners));
  const licensed = new Set(base.cells.filter(cell => cell.origin.kind === "licensed").flatMap(owners));
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

