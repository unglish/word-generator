import type { LanguageConfig } from "../config/language.js";
import type { BaseSpellingTraceV5 } from "./base-spelling.js";
import { createSpellingRuleSlots } from "./spelling-construction-slots.js";

/** Formation-slot completeness only; combine with operation replay and the other writer schedule checks. */
export function createSplitFormationScheduleVerifier(config: Pick<LanguageConfig, "spellingRules" | "sharedSpellings">) {
  if (config.sharedSpellings === undefined) throw new Error("Split schedule requires shared configuration");
  const slots = createSpellingRuleSlots(config.spellingRules ?? [], config.sharedSpellings).slots("syllable");
  const magic = slots.filter(slot => slot.kind === "regex" && slot.rule.name === "magic-e");
  if (magic.length !== 1) throw new Error("Split schedule requires one magic-e slot");
  const slotIndex = magic[0].index;
  return (trace: BaseSpellingTraceV5) => {
    const fail = (): never => { throw new Error("Invalid split formation schedule"); };
    const timeline = trace.shared.timeline;
    const last = trace.phones[trace.phones.length - 1];
    if (!last || trace.units.length !== trace.phones.length) fail();
    let nextAttempt = 0;
    const consumed = new Set<number>();
    function trials(start: number, route: "syllable" | "word", part: number, end: number): number {
      const nuclei = trace.phones.filter(phone => phone.syllableIndex === part && phone.segment === "nucleus");
      for (const [offset, phone] of nuclei.entries()) {
        const position = start + offset; const entry = timeline[position];
        const record = trace.split.attempts[nextAttempt];
        if (entry?.kind !== "split-attempt" || entry.index !== nextAttempt || !record ||
            record.attempt.nucleusId !== phone.id || record.attempt.route !== route ||
            record.attempt.cursor.lastAppendedUnitId !== end || entry.cursor.lastAppendedUnitId !== end ||
            record.attempt.cursor.nextEditId !== entry.cursor.nextEditId) fail();
        consumed.add(position); nextAttempt++;
      }
      return start + nuclei.length;
    }
    let nextPart = 0;
    for (const [position, entry] of timeline.entries()) {
      if (entry.kind !== "writer-step") continue;
      const step = trace.shared.writerSteps[entry.index];
      if (step?.kind !== "slot-start" || step.slot.phase !== "syllable" || step.slotIndex !== slotIndex) continue;
      const part = step.slot.partId;
      if (part !== nextPart++) fail();
      const phones = trace.phones.filter(phone => phone.syllableIndex === part);
      const end = phones[phones.length - 1]?.id;
      if (end === undefined || entry.cursor.lastAppendedUnitId !== end) fail();
      const after = timeline[trials(position + 1, "syllable", part, end)];
      const closing = after?.kind === "writer-step" ? trace.shared.writerSteps[after.index] : undefined;
      if (closing?.kind !== "slot-end" || closing.slot.phase !== "syllable" || closing.slot.partId !== part || closing.slotIndex !== slotIndex) fail();
    }
    if (nextPart !== last.syllableIndex + 1) fail();
    const boundaries = timeline.flatMap((entry, index) => entry.kind === "normalization-check" &&
      trace.normalization.checks[entry.index]?.site === "syllable-join" && entry.cursor.lastAppendedUnitId === last.id ? [index] : []);
    if (boundaries.length !== 1) fail();
    let start = boundaries[0] + 1;
    if (timeline[start]?.kind === "normalization-episode") {
      const episode = trace.normalization.episodes[timeline[start].index];
      if (episode?.site !== "syllable-join") fail();
      start++;
    }
    trials(start, "word", last.syllableIndex, last.id);
    if (nextAttempt !== trace.split.attempts.length || timeline.some((entry, index) => entry.kind === "split-attempt" && !consumed.has(index))) fail();
    return { syllableSlots: nextPart, wordSlots: 1, attempts: nextAttempt };
  };
}
