import type { LanguageConfig } from "../config/language.js";
import type { Word, WordGenerationContext } from "../types.js";
import { replayFinalNuclei } from "./final-nucleus-evidence.js";
import { verifyWordPronunciation } from "./pronunciation-evidence.js";
import { FinalSpelling } from "./final-spelling.js";
import { TraceCollector } from "./trace.js";
import { serializeTraceEvidence } from "./trace-evidence.js";
import { writeMorphology } from "./morphology/attach.js";
import { restoreMorphologyRegexState } from "./morphology/preparation-evidence.js";
import { finalizeMorphologySpelling } from "./morphology/finalize.js";
import { createGapSpellingApplicator } from "./gap-spelling.js";

function equal(actual: unknown, expected: unknown, message: string): void {
  if (serializeTraceEvidence(actual) !== serializeTraceEvidence(expected)) throw new Error(message);
}

/** Replay post-writer operations against configured lexical preparation and verified pronunciation. */
export function verifyLexicalSpellingOperations(word: Word, config: LanguageConfig): void {
  const finalPhones = verifyWordPronunciation(word, config);
  const lexical = replayFinalNuclei(word, config);
  const trace = word.trace!;
  const base = trace.baseSpelling!;
  const writer = trace.writerOutput;
  if (!writer || !trace.finalWord) throw new Error("Lexical spelling source unavailable");
  const cells = base.edits.find(edit => edit.phase === "gap")?.input ?? base.cells;
  if (cells.map(cell => cell.text).join("") !== writer.clean) throw new Error("Lexical writer surface mismatch");
  const collector = new TraceCollector();
  if (trace.morphology) collector.morphologyTrace = { template: trace.morphology.template,
    prefix: trace.morphology.prefix, suffix: trace.morphology.suffix, syllableReduction: trace.morphology.syllableReduction };
  const context: WordGenerationContext = {
    word: { syllables: structuredClone(lexical.context.word.syllables), lexical: structuredClone(word.lexical),
      written: { ...writer }, pronunciation: "" },
    trace: collector, syllableCount: word.syllables.length, currSyllableIndex: 0,
    finalSpelling: new FinalSpelling(writer.clean, cells),
    rand: () => { throw new Error("Unexpected written morphology draw"); },
  };
  const prepared = lexical.preparation?.prepared;
  if (prepared) {
    const record = trace.morphologyWriting;
    if (!record || record.version !== 1) throw new Error("Morphology writing evidence unavailable");
    equal(context.word, record.before, "Morphology writing input mismatch");
    restoreMorphologyRegexState(prepared.plan, record.regexBefore);
    const result = writeMorphology(context, prepared);
    equal(collector.morphologyWriting, record, "Morphology writing replay mismatch");
    finalizeMorphologySpelling(config, context, result);
    collector.morphologyTrace!.realization!.finalPhones = finalPhones.ledger.snapshot(finalPhones.ids, word.syllables);
    equal(collector.morphologyTrace!.realization, trace.morphology!.realization, "Final morphology realization mismatch");
    if (trace.gapSpellingPass) throw new Error("Affixed word has gap evidence");
  } else {
    if (trace.morphologyWriting) throw new Error("Bare word has morphology writing evidence");
    if (trace.morphology) finalizeMorphologySpelling(config, context, {
      parts: [{ role: "root", text: writer.clean }], spelling: context.finalSpelling,
    });
  }
  context.word.syllables = structuredClone(word.syllables);
  context.word.pronunciation = word.pronunciation;
  if (!prepared) {
    const gap = trace.gapSpellingPass;
    if (!gap || gap.version !== 1) throw new Error("Bare gap evidence unavailable");
    equal(context.word, gap.before, "Lexical gap input mismatch");
    let cursor = 0;
    context.rand = () => {
      const value = gap.rolls[cursor++];
      if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error("Invalid gap draw tape");
      return value;
    };
    createGapSpellingApplicator(config)(context);
    if (cursor !== gap.rolls.length) throw new Error("Unused gap draws");
    equal(collector.gapSpellingPass, gap, "Lexical gap replay mismatch");
  }
  equal(context.word.written, word.written, "Lexical final spelling mismatch");
  equal(context.finalSpelling!.snapshot(), trace.finalWord.spelling, "Lexical final cell lineage mismatch");
  equal(collector.spellingBudgets ?? [], trace.spellingBudgets?.filter(item => item.scope === "final-morphology") ?? [], "Lexical final budget mismatch");
}
