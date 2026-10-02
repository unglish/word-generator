import type { LanguageConfig } from "../../../src/config/language.js";
import type { Word } from "../../../src/types.js";
import { createBaseSpellingEvidenceVerifier } from "../../../src/core/spelling-evidence.js";
import { createCompletionObligationInspector } from "../../../src/core/spelling-completion-obligation.js";
import type { ConstructionLedgerView } from "../../../src/core/spelling-construction-ownership.js";

export type SplitCounts = Record<string, number>;
export interface SplitObservation {
  counts: SplitCounts;
  events: Array<{ category: string; nucleusId: number; sound: string; stress: string; detail: unknown }>;
}

/** Producer-assisted observer. Independent recount must not import this implementation. */
export function createSplitObserver(config: LanguageConfig) {
  const verify = createBaseSpellingEvidenceVerifier(config);
  const inspect = createCompletionObligationInspector(config, config.splitVowels?.supports ?? []);
  return (word: Word): SplitObservation => {
    const base = word.trace?.baseSpelling;
    if (!base) throw new Error("Split observation requires complete base trace");
    verify(base);
    const counts: SplitCounts = { words: 1, phones: base.phones.length, unresolvedCells: base.unresolvedCells,
      rootNuclei: base.phones.filter(phone => phone.segment === "nucleus").length };
    const events: SplitObservation["events"] = [];
    const add = (name: string, amount = 1) => { counts[name] = (counts[name] ?? 0) + amount; };
    const event = (category: string, nucleusId: number, detail: unknown) => {
      const phone = base.phones[nucleusId];
      events.push({ category, nucleusId, sound: phone.soundAtSpelling, stress: phone.boundary?.stress ?? "unspecified", detail: structuredClone(detail) });
    };
    add(`ledgerVersion:${base.version}`);
    if (base.unresolvedCells) add("wordsWithUnresolvedCells");
    if (word.trace?.spellingBudgets?.some(episode => episode.status === "infeasible")) add("wordsWithInfeasibleBudget");
    for (const edit of base.edits) {
      if (edit.rule === "spellingRule:magic-e" || edit.rule.startsWith("silentE:")) add(`historicalEdit:${edit.rule}`);
    }
    if (base.version !== 4 && base.version !== 5) {
      add("finalRootOwnershipUnavailableNuclei", counts.rootNuclei);
      add("formationEligibilityUnavailableWords");
      return { counts, events };
    }
    const splits = base.version === 5 ? base.split.constructions.filter(entry => base.split.liveConstructionIds.includes(entry.id)) : [];
    const view: ConstructionLedgerView = { cursor: { lastAppendedUnitId: base.units.length - 1, nextEditId: base.edits.length },
      phones: base.phones, units: base.units, cells: base.cells, certificates: base.certificates,
      normalizationCertificates: base.normalizationCertificates,
      constructions: base.shared.constructions.filter(entry => base.shared.liveConstructionIds.includes(entry.id)),
      ...(base.version === 5 ? { completionCertificates: base.completion.certificates } : {}) };
    for (const phone of base.phones) {
      if (phone.segment !== "nucleus") continue;
      const outcome = inspect(view, phone.id, splits);
      add(`finalRoot:${outcome.status}`);
      if (outcome.status === "satisfied") add(`finalRoot:satisfied:${outcome.reading}`);
      if (outcome.status === "unavailable") add(`finalRoot:unavailable:${outcome.reason}`);
      event(`finalRoot:${outcome.status}`, phone.id, outcome);
    }
    if (base.version === 4) {
      add("formationEligibilityUnavailableWords");
      return { counts, events };
    }
    add("formationAttempts", base.split.attempts.length);
    add("formedConstructions", base.split.constructions.length);
    add("liveConstructions", splits.length);
    add("supersededConstructions", base.split.constructions.length - splits.length);
    // Root certificates cannot establish whether morphology preserved a split vowel.
    add("finalAssembledConstructionStatusUnavailable", base.split.constructions.length);
    for (const { attempt } of base.split.attempts) {
      const outcome = attempt.status === "evaluated" ? attempt.trial.status : attempt.status;
      const category = `formation:${attempt.route}:${outcome}`;
      add(category); event(category, attempt.nucleusId, attempt);
      if (attempt.status === "evaluated") {
        add("formationEligibleTrials");
        if (attempt.trial.status !== "refused" && attempt.trial.roll !== undefined) add("formationDraws");
      } else if ("reason" in attempt) add(`formationRefusal:${attempt.reason}`);
      else add(`formationRefusal:${attempt.neighbors.reason}`);
    }
    add("completionAttempts", base.completion.attempts.length);
    add("completionReplacements", base.completion.certificates.length);
    for (const { attempt } of base.completion.attempts) {
      const outcome = attempt.status === "evaluated" ? attempt.sample.status : attempt.status;
      const category = `completion:${outcome}`;
      add(category); event(category, attempt.nucleusId, attempt);
      if (attempt.status !== "evaluated") continue;
      add(`completionPool:${attempt.pool.pool}`);
      if (attempt.pool.quotaRelaxed) add("completionQuotaRelaxations");
      if (attempt.sample.status === "selected" && attempt.sample.roll !== undefined) add("completionDraws");
      for (const candidate of attempt.sample.candidates) {
        add("completionProposals");
        add(candidate.refusal ? `completionProposalRefusal:${candidate.refusal}` : "completionRetainedProposals");
      }
    }
    return { counts, events };
  };
}
