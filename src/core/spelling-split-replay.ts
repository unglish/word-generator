import { BaseSpelling, createSplitSpellingRuntime } from "./base-spelling.js";
import type { BaseSpellingTraceV5 } from "./base-spelling.js";
import type { LanguageConfig } from "../config/language.js";
import type { SplitVowelRoutes, SplitVowelSupport } from "./spelling-split-policy.js";
import { spellingBoundaryContexts } from "./spelling-context.js";
import { createSpellingNormalizer } from "./spelling-normalization.js";
import { createSpellingCoveragePlanner } from "./spelling-coverage.js";
import { isSingleOwned } from "./spelling-ownership.js";

const equal = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
function require(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid split ledger replay: ${message}`);
}

/** Producer-assisted recorded-operation replay. This does not establish writer-schedule completeness. */
export function createSplitLedgerReplayer(configuration: LanguageConfig, supports: readonly SplitVowelSupport[], routes: SplitVowelRoutes) {
  const config = structuredClone(configuration);
  if (config.sharedSpellings === undefined) throw new Error("Split replay requires shared configuration");
  const rules = config.sharedSpellings;
  const runtime = createSplitSpellingRuntime(config, supports, routes, rules);
  const normalizer = createSpellingNormalizer(config, undefined, undefined, rules);
  const coverage = createSpellingCoveragePlanner(config, undefined, undefined, rules);
  return (trace: BaseSpellingTraceV5) => {
    require(trace.version === 5 && trace.phones.length === trace.units.length, "version or phone cardinality");
    for (const [id, unit] of trace.units.entries()) {
      const grapheme = config.graphemes[unit.inventoryIndex!];
      require(unit.id === id && unit.choiceId === id && equal(unit.phoneIds, [id]) && trace.phones[id].id === id &&
        grapheme?.form === unit.selected && grapheme.phoneme === trace.phones[id].soundAtSpelling, "source identity");
    }
    const contexts = spellingBoundaryContexts(trace.phones);
    const states = normalizer.historicalStates(trace.units, contexts);
    const choices = trace.units.map(unit => ({ inventoryIndex: unit.inventoryIndex!, form: unit.afterDoubling }));
    const base = new BaseSpelling(structuredClone(trace.phones), true, true, true, rules, config, undefined, runtime);
    let consumed = 0;
    while (consumed < trace.shared.timeline.length) {
      const entry = trace.shared.timeline[consumed];
      require(equal(entry.cursor, base.constructionState().cursor), "operation cursor");
      if (entry.kind === "append") {
        const unit = trace.units[entry.index];
        require(unit && entry.index === base.current().units.length, "append order");
        base.appendChoice(unit.choiceId, unit.selected, unit.afterDoubling, unit.inventoryIndex, unit.doublingIncrement);
      } else if (entry.kind === "writer-step") {
        const step = trace.shared.writerSteps[entry.index]; require(step, "writer step");
        base.setPhase(step.slot.phase); base.recordWriterStep(step.kind, step.slot, step.slotIndex);
      } else if (entry.kind === "scan-start") {
        const scan = trace.shared.scans[entry.index]; require(scan, "scan");
        base.setPhase(scan.slot.phase); base.beginSharedScan(scan.slot, scan.ruleId);
      } else if (entry.kind === "scan-end") {
        base.endSharedScan();
      } else if (entry.kind === "split-attempt") {
        const record = trace.split.attempts[entry.index]; require(record, "split attempt");
        base.setPhase(record.attempt.route); base.recordSplitAttempt(record.attempt);
      } else if (entry.kind === "split-guard") {
        const record = trace.split.guards[entry.index]; require(record, "split guard");
        base.setPhase(record.phase);
        if (record.operation === "batch") base.editBatch(record.edits);
        else {
          require(record.operation === "edit" && record.edits.length === 1, "guard operation");
          const edit = record.edits[0]; base.edit(edit.start, edit.deleteCount, edit.insert, edit.rule, edit.partId);
        }
      } else if (entry.kind === "rewrite") {
        const edit = trace.edits[entry.index]; require(edit && edit.phase !== "gap", "rewrite");
        base.setPhase(edit.phase); base.edit(edit.start, edit.input.length, edit.after, edit.rule, edit.partId ?? undefined);
      } else if (entry.kind === "shared") {
        const event = trace.shared.events[entry.index]; require(event, "shared event");
        if (event.kind === "attempt") {
          const { attempt } = trace.shared.attempts[event.index];
          base.setPhase(attempt.slot.phase); base.recordSharedAttempt(attempt.slot, attempt.ruleId, attempt.sourceUnitIds, attempt);
        } else if (event.kind === "guard") {
          const guard = trace.shared.editGuards[event.index]; require(guard, "shared guard");
          base.setPhase(guard.phase); base.edit(guard.start, guard.deleteCount, guard.insert, guard.rule, guard.partId ?? undefined);
        } else if (event.kind === "transaction") {
          const transaction = trace.shared.transactions[event.index]; require(transaction, "shared transaction");
          base.setPhase(transaction.phase); base.editBatch(transaction.edits);
        } else {
          require(event.kind === "supersession", "shared event kind");
          const replacement = trace.shared.supersessions[event.index]; require(replacement && replacement.rule.startsWith("gapSpelling:"), "supersession");
          base.replaceWithGapSpelling(replacement.before, replacement.after, replacement.rule.slice("gapSpelling:".length));
        }
      } else if (entry.kind === "normalization-check") {
        const check = trace.normalization.checks[entry.index]; require(check, "normalization check");
        const { cells, phones, units } = base.current(); const end = units.length - 1;
        require(end >= 0, "check before append"); const part = phones[end].syllableIndex;
        const previous = cells.filter(cell => check.site === "adjacent-choice"
          ? phones[end - 1]?.syllableIndex === part && isSingleOwned(cell.origin) && cell.origin.unitId === end - 1
          : cell.partId === part - 1);
        const right = cells.find(cell => check.site === "adjacent-choice"
          ? cell.origin.kind === "selection" && cell.origin.unitId === end : cell.partId === part);
        base.recordNormalizationCheck(check.site, !!previous.length && !!right);
      } else if (entry.kind === "normalization-episode") {
        const episode = trace.normalization.episodes[entry.index]; require(episode, "normalization episode");
        const view = base.constructionState(); const rightIndex = view.cells.findIndex(cell => cell.id === episode.rightCellId);
        const decision = normalizer.decide({ ...base.current(), ...base.normalizationState(), contexts, states,
          site: episode.site, rightIndex, shared: { constructions: view.constructions, certificates: view.certificates } });
        base.setPhase(episode.site === "adjacent-choice" ? "selection" : "syllable");
        base.recordNormalization(episode.site, rightIndex, decision);
      } else if (entry.kind === "coverage") {
        const certificate = trace.certificates[entry.index]; require(certificate, "coverage certificate");
        const current = contexts.map((context, id) => ({ ...context, grapheme: config.graphemes[choices[id].inventoryIndex], form: choices[id].form }));
        coverage.verify(base, current, certificate); base.setPhase("word"); base.commitLicensedPlan(certificate);
        certificate.choices.forEach((choice, id) => { choices[id] = { inventoryIndex: choice.inventoryIndex, form: choice.afterDoubling }; });
      } else require(false, "unknown operation");
      const produced = base.snapshot(); require(produced.version === 5, "lost capability");
      const count = produced.shared.timeline.length;
      require(count > consumed && count <= trace.shared.timeline.length &&
        equal(produced.shared.timeline, trace.shared.timeline.slice(0, count)), "operation timeline mismatch");
      consumed = count;
    }
    require(equal(base.snapshot(), trace), "complete trace mismatch");
    return { version: 5 as const, recordedOperations: consumed, splitAttempts: trace.split.attempts.length,
      splitConstructions: trace.split.constructions.length, writerSchedule: "unverified" as const };
  };
}
