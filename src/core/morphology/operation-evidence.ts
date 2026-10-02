import { verifyLexicalSpellingOperations } from "../lexical-spelling-evidence.js";
import { serializeTraceEvidence } from "../trace-evidence.js";
import { finalizeMorphologySpelling } from "./finalize.js";
import type { LanguageConfig } from "../../config/language.js";
import type { Word, WordGenerationContext } from "../../types.js";
import { FinalPhones } from "../final-phones.js";
import { FinalSpelling } from "../final-spelling.js";
import { TraceCollector } from "../trace.js";
import { verifyConfiguredAllomorphs } from "./allomorph-evidence.js";
import { applyMorphology, morphologyRegexState } from "./attach.js";
import type { MorphologyPlan } from "./plan.js";

/** Replays the attachment stage; final letter cleanup and plan sampling are separate contracts. */
export function verifyMorphologyOperations(word: Word, configuration: LanguageConfig): void {
  if (word.lexical) { verifyLexicalSpellingOperations(word, configuration); return; }
  verifyConfiguredAllomorphs(word, configuration);
  const trace = word.trace!;
  if (!trace.morphology) {
    if (trace.morphologyPass) throw new Error("Morphology pass without plan");
    return;
  }
  const record = trace.morphologyPass;
  if (!record || record.version !== 1) throw new Error("Morphology pass unavailable");
  if (trace.morphology.template === "bare") {
    if (record.rolls.length || record.realization || serializeTraceEvidence(record.before) !== serializeTraceEvidence(record.after)) {
      throw new Error("Invalid bare morphology pass");
    }
    return;
  }
  const realized = trace.morphology.realization!;
  if (!realized.selectionPhones || !record.realization) throw new Error("Morphology root source unavailable");
  const base = trace.baseSpelling!;
  const rootPronunciation = trace.pronunciationPasses![0];
  if (serializeTraceEvidence(record.before.syllables) !== serializeTraceEvidence(rootPronunciation.after) ||
      record.before.pronunciation !== rootPronunciation.pronunciation || record.before.written.clean !== base.surface ||
      serializeTraceEvidence(record.before.written) !== serializeTraceEvidence(trace.writerOutput)) {
    throw new Error("Morphology input source mismatch");
  }
  const config = structuredClone(configuration);
  const template = trace.morphology.template;
  if (template !== "prefixed" && template !== "suffixed" && template !== "both") throw new Error("Invalid morphology template");
  const prefixIndex = realized.configurationIndices?.prefix;
  const suffixIndex = realized.configurationIndices?.suffix;
  const plan: MorphologyPlan = { template,
    ...(prefixIndex === undefined ? {} : { prefix: config.morphology!.prefixes[prefixIndex] }),
    ...(suffixIndex === undefined ? {} : { suffix: config.morphology!.suffixes[suffixIndex] }),
  };
  const slots = morphologyRegexState(plan);
  if (slots.length !== record.regexBefore.length) throw new Error("Morphology regex state count mismatch");
  slots.forEach((slot, index) => {
    const source = record.regexBefore[index];
    if (slot.part !== source.part || slot.phase !== source.phase || slot.index !== source.index ||
        !Number.isSafeInteger(source.lastIndex) || source.lastIndex < 0) throw new Error("Invalid morphology regex state");
    const affix = plan[slot.part]!;
    const regex = slot.phase === "boundary" ? affix.boundaryTransforms![slot.index].match : affix.morphophonemicRules![slot.index].writtenMatch!;
    regex.lastIndex = source.lastIndex;
  });
  let cursor = 0;
  const collector = new TraceCollector();
  collector.morphologyTrace = { template, prefix: plan.prefix?.written, suffix: plan.suffix?.written,
    syllableReduction: trace.morphology.syllableReduction };
  const context: WordGenerationContext = {
    word: structuredClone(record.before), syllableCount: record.before.syllables.length, currSyllableIndex: 0, trace: collector,
    finalSpelling: new FinalSpelling(base.surface, base.cells),
    finalPhoneState: FinalPhones.restore(realized.selectionPhones, record.before.syllables),
    rand: () => {
      const value = record.rolls[cursor++];
      if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error("Invalid morphology draw tape");
      return value;
    },
  };
  const result = applyMorphology({ config }, context, plan);
  if (cursor !== record.rolls.length) throw new Error("Unused morphology draws");
  if (serializeTraceEvidence(collector.morphologyPass) !== serializeTraceEvidence(record)) throw new Error("Morphology operation replay mismatch");
  finalizeMorphologySpelling(config, context, result);
  if (serializeTraceEvidence(collector.morphologyTrace!.realization) !== serializeTraceEvidence(realized)) throw new Error("Morphology final realization mismatch");
  if (serializeTraceEvidence(context.word.written) !== serializeTraceEvidence(word.written)) throw new Error("Morphology final spelling mismatch");
  if (serializeTraceEvidence(context.finalSpelling!.snapshot()) !== serializeTraceEvidence(trace.finalWord?.spelling)) throw new Error("Morphology final cell lineage mismatch");
  const finalPhones = context.finalPhoneState!.ledger.snapshot(context.finalPhoneState!.ids, context.word.syllables);
  if (serializeTraceEvidence(finalPhones) !== serializeTraceEvidence(trace.finalWord?.phones)) throw new Error("Morphology final phone lineage mismatch");
  const finalBudgets = trace.spellingBudgets?.filter(item => item.scope === "final-morphology") ?? [];
  if (serializeTraceEvidence(collector.spellingBudgets ?? []) !== serializeTraceEvidence(finalBudgets)) throw new Error("Morphology final budget mismatch");
  if (serializeTraceEvidence(record.after.syllables) !== serializeTraceEvidence(word.syllables)) throw new Error("Morphology final phones mismatch");
}
