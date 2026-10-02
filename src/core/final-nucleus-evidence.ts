import type { LanguageConfig } from "../config/language.js";
import { resolveStressRules } from "../config/language.js";
import type { Word, WordGenerationContext } from "../types.js";
import { FinalPhones } from "./final-phones.js";
import { repairFinalNuclei } from "./final-nucleus.js";
import { replayMorphologyPreparation } from "./morphology/preparation-evidence.js";
import { TraceCollector } from "./trace.js";
import { serializeTraceEvidence } from "./trace-evidence.js";

/** Bind final nucleus repair to verified preparation and the emitted lexical views. */
export function replayFinalNuclei(word: Word, config: LanguageConfig) {
  const trace = word.trace;
  const record = trace?.finalNucleus;
  if (!record || record.version !== 1 || !word.lexical) throw new Error("Final nucleus evidence unavailable");
  const preparation = trace.morphologyPreparation ? replayMorphologyPreparation(word, config) : undefined;
  if (trace.morphology && !preparation) throw new Error("Missing morphology preparation");
  const source = preparation?.context.word.syllables ?? record.rootBefore;
  const rootSource = trace.morphologyPreparation?.before.syllables ?? record.rootBefore;
  const rootStart = preparation?.prepared?.rootSyllableStart ?? 0;
  if (serializeTraceEvidence(source) !== serializeTraceEvidence(record.before) ||
      serializeTraceEvidence(rootSource) !== serializeTraceEvidence(record.rootBefore) || rootStart !== record.rootSyllableStart) {
    throw new Error("Final nucleus input mismatch");
  }
  const ledger = new FinalPhones();
  const initial = preparation?.context.finalPhoneState ?? { ledger, ids: ledger.register("root", source) };
  if (serializeTraceEvidence(initial.ledger.snapshot(initial.ids, source)) !== serializeTraceEvidence(record.phonesBefore)) {
    throw new Error("Final nucleus phone input mismatch");
  }
  let cursor = 0;
  const context: WordGenerationContext = { word: { syllables: structuredClone(source), written: { clean: "", hyphenated: "" }, pronunciation: "" },
    trace: new TraceCollector(), finalPhoneState: initial, syllableCount: source.length, currSyllableIndex: 0,
    rand: () => {
      const value = record.rolls[cursor++];
      if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error("Invalid final nucleus draw tape");
      return value;
    } };
  const root = structuredClone(rootSource);
  repairFinalNuclei(context, root, rootStart, Array.from(config.phonemeMaps.nucleus.values()).flat(), resolveStressRules(config.pronunciation?.stress));
  if (cursor !== record.rolls.length) throw new Error("Unused final nucleus draws");
  if (serializeTraceEvidence(context.trace!.finalNucleus) !== serializeTraceEvidence(record)) throw new Error("Final nucleus replay mismatch");
  if (serializeTraceEvidence(root) !== serializeTraceEvidence(trace.writerInput) ||
      serializeTraceEvidence({ root, syllables: context.word.syllables, rootSyllableStart: rootStart }) !== serializeTraceEvidence(word.lexical)) {
    throw new Error("Final lexical view mismatch");
  }
  return { context, root, preparation };
}
