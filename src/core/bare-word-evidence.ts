import { verifyLexicalSpellingOperations } from "./lexical-spelling-evidence.js";
import { serializeTraceEvidence } from "./trace-evidence.js";
import type { LanguageConfig } from "../config/language.js";
import type { Word, WordGenerationContext } from "../types.js";
import { FinalSpelling } from "./final-spelling.js";
import { verifyFinalWordSourceLinks } from "./final-word-sources.js";
import { verifyWordPronunciation } from "./pronunciation-evidence.js";
import { createGapSpellingApplicator } from "./gap-spelling.js";
import { applyMorphology } from "./morphology/attach.js";
import { finalizeMorphologySpelling } from "./morphology/finalize.js";
import { TraceCollector } from "./trace.js";

/** Replays bare cleanup and configured gap selection from the observed writer output. */
export function verifyBareWordOperations(word: Word, config: LanguageConfig): void {
  if (word.lexical) { verifyLexicalSpellingOperations(word, config); return; }
  verifyFinalWordSourceLinks(word);
  const rootState = verifyWordPronunciation(word, config);
  const trace = word.trace!;
  if (trace.morphology && trace.morphology.template !== "bare") {
    if (trace.gapSpellingPass) throw new Error("Affixed word has a gap pass");
    return;
  }
  const record = trace.gapSpellingPass;
  if (!record || record.version !== 1 || !trace.writerOutput) throw new Error("Bare operation source unavailable");
  const base = trace.baseSpelling!;
  const cells = base.edits.find(edit => edit.phase === "gap")?.input ?? base.cells;
  const surface = cells.map(cell => cell.text).join("");
  if (surface !== trace.writerOutput.clean) throw new Error("Bare writer surface mismatch");
  const root = trace.pronunciationPasses![0];
  const collector = new TraceCollector();
  const context: WordGenerationContext = {
    word: { syllables: structuredClone(root.after), pronunciation: root.pronunciation, written: { ...trace.writerOutput } },
    syllableCount: root.after.length, currSyllableIndex: 0, trace: collector,
    finalSpelling: new FinalSpelling(surface, cells),
    finalPhoneState: rootState,
    rand: () => { throw new Error("Unexpected bare morphology draw"); },
  };
  if (trace.morphology) {
    collector.morphologyTrace = { template: "bare", syllableReduction: trace.morphology.syllableReduction };
    const result = applyMorphology({ config }, context, { template: "bare" });
    if (serializeTraceEvidence(collector.morphologyPass) !== serializeTraceEvidence(trace.morphologyPass)) throw new Error("Bare morphology replay mismatch");
    finalizeMorphologySpelling(config, context, result);
  } else if (trace.morphologyPass) throw new Error("Bare pass without morphology plan");
  if (serializeTraceEvidence(context.word) !== serializeTraceEvidence(record.before)) throw new Error("Gap input binding mismatch");
  let cursor = 0;
  context.rand = () => {
    const value = record.rolls[cursor++];
    if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error("Invalid gap draw tape");
    return value;
  };
  createGapSpellingApplicator(config)(context);
  if (cursor !== record.rolls.length) throw new Error("Unused gap draws");
  if (serializeTraceEvidence(collector.gapSpellingPass) !== serializeTraceEvidence(record)) throw new Error("Gap operation replay mismatch");
  if (serializeTraceEvidence(context.word.written) !== serializeTraceEvidence(word.written) ||
      serializeTraceEvidence(context.finalSpelling!.snapshot()) !== serializeTraceEvidence(trace.finalWord!.spelling)) {
    throw new Error("Bare final spelling mismatch");
  }
  if (serializeTraceEvidence(rootState.ledger.snapshot(rootState.ids, root.after)) !== serializeTraceEvidence(trace.finalWord!.phones)) {
    throw new Error("Bare final phone lineage mismatch");
  }
  const finalBudgets = trace.spellingBudgets?.filter(item => item.scope === "final-morphology") ?? [];
  if (serializeTraceEvidence(collector.spellingBudgets ?? []) !== serializeTraceEvidence(finalBudgets)) throw new Error("Bare final budget mismatch");
}
