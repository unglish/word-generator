import type { LanguageConfig, SharedSpellingRule } from "../config/language.js";
import type { BaseSpellingTraceV4 } from "./base-spelling.js";
import type { SharedSpellingSlot } from "./spelling-construction.js";
import type { SharedWriterStep } from "./spelling-construction-types.js";
import { createSpellingRuleSlots } from "./spelling-construction-slots.js";
import type { SpellingRuleSlot } from "./spelling-construction-slots.js";

const equal = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
function require(condition: unknown, reason: string): asserts condition {
  if (!condition) throw new Error(`Invalid shared writer schedule: ${reason}`);
}

type ScheduledAction =
  | { kind: "append"; index: number; end: number }
  | { kind: "check"; site: "adjacent-choice" | "syllable-join"; end: number }
  | { kind: "writer"; step: SharedWriterStep["kind"]; slot: SharedSpellingSlot; slotIndex: number | null; end: number };

/** Verifies configured pass/slot completeness. Combine with event-time ledger replay, not a standalone license. */
export function createSharedWriterScheduleVerifier(config: Pick<LanguageConfig, "spellingRules">, rules: readonly SharedSpellingRule[]) {
  const compiler = createSpellingRuleSlots(config.spellingRules ?? [], rules);
  const passes = { syllable: compiler.slots("syllable"), word: compiler.slots("word") };
  return (trace: BaseSpellingTraceV4) => {
    const expected: ScheduledAction[] = [];
    const pass = (slot: SharedSpellingSlot, end: number) => {
      const push = (step: SharedWriterStep["kind"], slotIndex: number | null = null) =>
        expected.push({ kind: "writer", step, slot, slotIndex, end });
      push("pass-start");
      for (const entry of passes[slot.phase]) { push("slot-start", entry.index); push("slot-end", entry.index); }
      push("pass-end");
    };
    require(trace.units.length === trace.phones.length && trace.units.length > 0, "original phone cardinality");
    let lastPart = 0;
    for (const [id, phone] of trace.phones.entries()) {
      require(phone.id === id && Number.isSafeInteger(phone.syllableIndex) &&
        (phone.syllableIndex === lastPart || (id > 0 && phone.syllableIndex === lastPart + 1)), "original syllable order");
      lastPart = phone.syllableIndex;
      expected.push({ kind: "append", index: id, end: id - 1 }, { kind: "check", site: "adjacent-choice", end: id });
      if (trace.phones[id + 1]?.syllableIndex !== phone.syllableIndex) {
        pass({ phase: "syllable", partId: phone.syllableIndex }, id);
        expected.push({ kind: "check", site: "syllable-join", end: id });
      }
    }
    pass({ phase: "word", partId: null }, trace.units.length - 1);

    let next = 0; let nextStep = 0; let scans = 0; let slots = 0;
    let activePass: SharedSpellingSlot | undefined;
    let activeSlot: SpellingRuleSlot | undefined;
    let activeScan: number | undefined;
    let slotScans = 0;
    let wordReady = false; let wordFinished = false;
    let precedingCheck: "adjacent-choice" | "syllable-join" | undefined;

    function checkRegex(rule: string, phase: string, partId: number | null | undefined): void {
      if (activePass) {
        require(activeSlot?.kind === "regex" && rule === `spellingRule:${activeSlot.rule.name}` &&
          phase === activePass.phase && (activePass.phase === "word" || partId === activePass.partId), "regex operation outside its slot");
      } else require(wordReady && !wordFinished && phase === "word" && !rule.startsWith("spellingRule:"), "unscheduled generic operation");
    }

    for (const entry of trace.shared.timeline) {
      if (entry.kind === "append" || entry.kind === "normalization-check" || entry.kind === "writer-step") {
        const action = expected[next++];
        require(action && entry.cursor.lastAppendedUnitId === action.end, "missing/reordered required operation");
        precedingCheck = undefined;
        if (entry.kind === "append") {
          require(action.kind === "append" && action.index === entry.index, "append position");
        } else if (entry.kind === "normalization-check") {
          const check = trace.normalization.checks[entry.index];
          require(action.kind === "check" && check?.site === action.site, "normalization position");
          precedingCheck = check.site;
          if (check.site === "syllable-join" && action.end === trace.units.length - 1) wordReady = true;
        } else {
          const step = trace.shared.writerSteps[entry.index];
          require(entry.index === nextStep++ && step && action.kind === "writer" && step.kind === action.step &&
            equal(step.slot, action.slot) && step.slotIndex === action.slotIndex && equal(step.cursor, entry.cursor), "configured slot order");
          if (step.kind === "pass-start") { require(!activePass, "nested pass"); activePass = step.slot; }
          else if (step.kind === "pass-end") {
            require(activePass && !activeSlot && activeScan === undefined, "unfinished pass");
            if (step.slot.phase === "word") wordFinished = true;
            activePass = undefined;
          } else if (step.kind === "slot-start") {
            require(activePass && !activeSlot, "nested slot");
            activeSlot = passes[step.slot.phase].find(slot => slot.index === step.slotIndex);
            require(activeSlot, "unknown slot"); slotScans = 0; slots++;
          } else {
            require(activeSlot && activeScan === undefined && slotScans === (activeSlot.kind === "shared" ? 1 : 0), "missing/incomplete scan");
            activeSlot = undefined;
          }
        }
        continue;
      }
      if (entry.kind === "normalization-episode") {
        require(precedingCheck && trace.normalization.episodes[entry.index]?.site === precedingCheck && !activePass, "normalization episode position");
        precedingCheck = undefined;
        continue;
      }
      precedingCheck = undefined;
      if (entry.kind === "scan-start") {
        const scan = trace.shared.scans[entry.index];
        require(activePass && activeSlot?.kind === "shared" && activeScan === undefined && slotScans === 0 &&
          scan && scan.ruleId === activeSlot.ruleId && equal(scan.slot, activePass), "scan outside configured slot");
        activeScan = entry.index; slotScans++; scans++;
      } else if (entry.kind === "scan-end") {
        require(activeScan === entry.index, "unmatched scan end"); activeScan = undefined;
      } else if (entry.kind === "rewrite") {
        const edit = trace.edits[entry.index]; require(edit, "missing rewrite");
        checkRegex(edit.rule, edit.phase, edit.partId);
      } else if (entry.kind === "coverage") {
        require(wordReady && !activePass, "coverage inside spelling pass");
      } else if (entry.kind === "shared") {
        const event = trace.shared.events[entry.index]; require(event, "missing shared event");
        if (event.kind === "attempt") {
          const attempt = trace.shared.attempts[event.index]?.attempt;
          require(activeSlot?.kind === "shared" && activeScan !== undefined && attempt &&
            attempt.ruleId === activeSlot.ruleId && equal(attempt.slot, activePass), "attempt outside scan");
        } else if (event.kind === "guard") {
          const guard = trace.shared.editGuards[event.index]; require(guard, "missing guard");
          checkRegex(guard.rule, guard.phase, guard.partId);
        } else if (event.kind === "transaction") {
          const transaction = trace.shared.transactions[event.index];
          require(!activePass && wordReady && !wordFinished && transaction?.phase === "word" &&
            transaction.edits.every(edit => !edit.rule.startsWith("spellingRule:")), "transaction position");
        } else require(event.kind === "supersession" && wordFinished && !activePass, "supersession position");
      } else require(false, "unknown or unscheduled operation");
    }
    require(next === expected.length && nextStep === trace.shared.writerSteps.length && scans === trace.shared.scans.length &&
      wordFinished && !activePass && !activeSlot && activeScan === undefined, "incomplete writer schedule");
    return { verifiedPasses: lastPart + 2, verifiedSlots: slots, verifiedScans: scans };
  };
}
