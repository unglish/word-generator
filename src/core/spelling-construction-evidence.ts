import type { LanguageConfig, SharedSpellingRule } from "../config/language.js";
import { BaseSpelling, createSharedSpellingRuntime } from "./base-spelling.js";
import type { BaseSpellingTraceV4 } from "./base-spelling.js";
import { spellingBoundaryContexts } from "./spelling-context.js";
import { validateSharedFormationBindings } from "./spelling-construction-bindings.js";
import { validateSharedEventOrder } from "./spelling-construction-events.js";
import { createSharedEventReplayer } from "./spelling-construction-replay.js";
import { createSpellingCoveragePlanner } from "./spelling-coverage.js";
import { createSpellingNormalizer } from "./spelling-normalization.js";
import { verifyNormalizationChecks } from "./spelling-normalization-checks.js";
import { isSingleOwned } from "./spelling-ownership.js";

const equal = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
function require(condition: unknown, reason: string): asserts condition {
  if (!condition) throw new Error(`Invalid shared ledger replay: ${reason}`);
}

/** Ledger semantics and normalization schedule only. Shared writer-slot completeness is not yet authenticated. */
export function createSharedLedgerReplayer(config: LanguageConfig, rules: readonly SharedSpellingRule[]) {
  const normalizer = createSpellingNormalizer(config, undefined, undefined, rules);
  const coverage = createSpellingCoveragePlanner(config, undefined, undefined, rules);
  const sharedReplay = createSharedEventReplayer(config, rules);
  const sharedRuntime = createSharedSpellingRuntime(rules, config);
  return (trace: BaseSpellingTraceV4) => {
    require(trace.version === 4 && equal(trace.capabilities,
      { exactParts: 1, licensedOrigins: 1, writerBoundary: 1, unitNormalization: 1, sharedConstructions: 1 }), "capabilities");
    require(Array.isArray(trace.shared.timeline) && trace.phones.length === trace.units.length, "timeline/phone cardinality");
    validateSharedEventOrder(trace);
    validateSharedFormationBindings(trace);
    const contexts = spellingBoundaryContexts(trace.phones);
    const states = normalizer.historicalStates(trace.units, contexts);
    for (const [id, unit] of trace.units.entries()) {
      const grapheme = config.graphemes[unit.inventoryIndex!];
      require(unit.id === id && unit.choiceId === id && equal(unit.phoneIds, [id]) && trace.phones[id].id === id &&
        grapheme?.form === unit.selected && grapheme.phoneme === trace.phones[id].soundAtSpelling, "original unit identity");
    }
    const base = new BaseSpelling(structuredClone(trace.phones), true, true, true, rules, config, sharedRuntime);
    const priorChoices = trace.units.map(unit => ({ inventoryIndex: unit.inventoryIndex!, form: unit.afterDoubling }));
    let nextCellId = 0;
    let nextShared = 0;
    let nextScan = 0;
    let activeScan: number | undefined;
    let nextCheck = 0;
    let nextEpisode = 0;
    let nextCoverage = 0;
    let pending: { site: "adjacent-choice" | "syllable-join"; rightIndex: number } | undefined;

    for (const entry of trace.shared.timeline) {
      require(equal(entry.cursor, base.constructionState().cursor) && Number.isSafeInteger(entry.index) && entry.index >= 0, "operation cursor/index");
      require(!pending || entry.kind === "normalization-episode", "missing immediate collision episode");
      require(activeScan === undefined || entry.kind === "scan-end" ||
        (entry.kind === "shared" && trace.shared.events[entry.index]?.kind === "attempt"), "interrupted shared scan");
      if (entry.kind === "scan-start") {
        require(entry.index === nextScan++ && activeScan === undefined, "scan start order");
        const scan = trace.shared.scans[entry.index];
        require(scan && scan.id === entry.index && equal(scan.cursor, entry.cursor), "scan identity");
        base.setPhase(scan.slot.phase);
        base.beginSharedScan(scan.slot, scan.ruleId);
        activeScan = entry.index;
      } else if (entry.kind === "scan-end") {
        require(activeScan === entry.index, "scan end order");
        base.endSharedScan();
        activeScan = undefined;
      } else if (entry.kind === "append") {
        const id = base.current().units.length;
        const unit = trace.units[id];
        require(entry.index === id && unit && equal(unit.sourceCellIds, unit.afterDoubling.split("").map((_, offset) => nextCellId + offset)), "append allocation/order");
        base.appendChoice(id, unit.selected, unit.afterDoubling, unit.inventoryIndex, unit.doublingIncrement);
        nextCellId += unit.afterDoubling.length;
      } else if (entry.kind === "shared") {
        require(entry.index === nextShared++, "shared event order");
        const event = trace.shared.events[entry.index];
        require(event && equal(event.cursor, entry.cursor), "shared event cursor");
        const expected = sharedReplay(trace, event, { view: base.constructionState(), nextCellId });
        if (event.kind === "attempt") {
          const attempt = trace.shared.attempts[event.index].attempt;
          base.setPhase(attempt.slot.phase);
          base.recordSharedAttempt(attempt.slot, attempt.ruleId, attempt.sourceUnitIds, attempt);
        } else if (event.kind === "guard") {
          const guard = trace.shared.editGuards[event.index];
          base.setPhase(guard.phase);
          base.edit(guard.start, guard.deleteCount, guard.insert, guard.rule, guard.partId ?? undefined);
        } else if (event.kind === "transaction") {
          const transaction = trace.shared.transactions[event.index];
          base.setPhase(transaction.phase);
          base.editBatch(transaction.edits);
        } else {
          const gap = trace.shared.supersessions[event.index];
          base.replaceWithGapSpelling(gap.before, gap.after, gap.rule.slice("gapSpelling:".length));
        }
        require(equal(base.constructionState(), expected.view), "shared resulting state");
        nextCellId = expected.nextCellId;
      } else if (entry.kind === "rewrite") {
        require(entry.index === entry.cursor.nextEditId && !base.constructionState().constructions.length, "unguarded rewrite");
        const edit = trace.edits[entry.index];
        require(edit && edit.output.every(cell => cell.origin.kind === "rewrite") && edit.phase !== "gap", "rewrite identity");
        base.setPhase(edit.phase);
        base.edit(edit.start, edit.input.length, edit.after, edit.rule, edit.partId ?? undefined);
        nextCellId += edit.output.length;
      } else if (entry.kind === "normalization-check") {
        require(entry.index === nextCheck++, "normalization check order");
        const check = trace.normalization.checks[entry.index];
        require(check && equal(check.cursor, entry.cursor), "normalization check cursor");
        const { cells, units, phones } = base.current();
        const end = units.length - 1;
        require(end >= 0, "normalization before append");
        const part = phones[end].syllableIndex;
        const previous = check.site === "adjacent-choice"
          ? cells.filter(cell => phones[end - 1]?.syllableIndex === part && isSingleOwned(cell.origin) && cell.origin.unitId === end - 1)
          : cells.filter(cell => cell.partId === part - 1);
        const rightIndex = cells.findIndex(cell => check.site === "adjacent-choice"
          ? cell.origin.kind === "selection" && cell.origin.unitId === end : cell.partId === part);
        const left = previous[previous.length - 1]; const right = cells[rightIndex];
        base.recordNormalizationCheck(check.site, !!left && !!right);
        if (left && right && left.text === right.text) pending = { site: check.site, rightIndex };
      } else if (entry.kind === "normalization-episode") {
        require(pending && entry.index === nextEpisode++, "normalization episode order");
        const episode = trace.normalization.episodes[entry.index];
        require(episode && episode.id === entry.index && episode.site === pending.site && equal(episode.cursor, entry.cursor), "episode identity");
        const view = base.constructionState();
        const input = { ...base.current(), ...base.normalizationState(), contexts, states,
          site: pending.site, rightIndex: pending.rightIndex, shared: { constructions: view.constructions, certificates: view.certificates } };
        const decision = normalizer.decide(input);
        if (decision.status === "normalized") {
          require(episode.outcome.status === "normalized", "normalization outcome");
          const certificate = trace.normalizationCertificates[episode.outcome.certificateId];
          require(certificate?.id === base.normalizationState().certificates.length, "normalization certificate order");
          const { id, ...plan } = certificate;
          require(id === episode.outcome.certificateId, "normalization certificate identity");
          normalizer.verify(input, plan);
          nextCellId += plan.after.length;
        } else require(episode.outcome.status === "retained" && episode.outcome.reason === decision.reason, "retained normalization reason");
        base.setPhase(pending.site === "adjacent-choice" ? "selection" : "syllable");
        base.recordNormalization(pending.site, pending.rightIndex, decision);
        pending = undefined;
      } else if (entry.kind === "coverage") {
        require(entry.index === nextCoverage++ && base.current().units.length === trace.units.length, "coverage order/scope");
        const certificate = trace.certificates[entry.index];
        require(certificate?.id === entry.index, "coverage identity");
        const choices = contexts.map((context, id) => ({ ...context, grapheme: config.graphemes[priorChoices[id].inventoryIndex], form: priorChoices[id].form }));
        coverage.verify(base, choices, certificate);
        base.setPhase("word");
        base.commitLicensedPlan(certificate);
        nextCellId += certificate.replacements.reduce((sum, replacement) => sum + replacement.after.length, 0);
        certificate.choices.forEach((choice, id) => { priorChoices[id] = { inventoryIndex: choice.inventoryIndex, form: choice.afterDoubling }; });
      } else require(false, "unobserved normalization or unknown operation");
    }
    require(activeScan === undefined && nextScan === trace.shared.scans.length && !pending && nextShared === trace.shared.events.length && nextCheck === trace.normalization.checks.length &&
      nextEpisode === trace.normalization.episodes.length && nextCoverage === trace.certificates.length &&
      base.current().units.length === trace.units.length, "incomplete operation stream");
    verifyNormalizationChecks(trace);
    require(equal(base.snapshot(), trace), "complete trace mismatch");
    return { version: 4 as const, verifiedSharedEvents: nextShared, verifiedCertificates: nextCoverage,
      verifiedNormalizations: trace.normalizationCertificates.length, verifiedEpisodes: nextEpisode,
      sharedWriterSchedule: "unverified" as const };
  };
}
