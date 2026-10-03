import { buildClusterRuntime } from "../cluster-runtime.js";
import { bindMorphophonemicGuard } from "../morphophonemic-guard.js";
import type { LanguageConfig } from "../../config/language.js";
import type { Word, WordGenerationContext } from "../../types.js";
import { FinalPhones } from "../final-phones.js";
import { TraceCollector } from "../trace.js";
import { serializeTraceEvidence } from "../trace-evidence.js";
import { morphologyRegexState, prepareMorphology } from "./attach.js";
import type { MorphologyPlan } from "./plan.js";
import type { MorphologyRegexState } from "./realization.js";

export function restoreMorphologyRegexState(plan: MorphologyPlan, states: MorphologyRegexState[]): void {
  const slots = morphologyRegexState(plan);
  if (slots.length !== states.length) throw new Error("Morphology regex state count mismatch");
  slots.forEach((slot, index) => {
    const state = states[index];
    if (slot.part !== state.part || slot.phase !== state.phase || slot.index !== state.index ||
        !Number.isSafeInteger(state.lastIndex) || state.lastIndex < 0) throw new Error("Invalid morphology regex state");
    const affix = plan[slot.part]!;
    const regex = slot.phase === "boundary" ? affix.boundaryTransforms![slot.index].match : affix.morphophonemicRules![slot.index].writtenMatch!;
    regex.lastIndex = state.lastIndex;
  });
}

function restoreRootInventoryPhones(word: Word, config: LanguageConfig): void {
  const inventory = new Map(config.phonemes.map(phone => [serializeTraceEvidence(phone), phone]));
  for (const syllable of word.syllables) {
    for (const segment of ["onset", "nucleus", "coda"] as const) {
      syllable[segment] = syllable[segment].map(phone => {
        const canonical = inventory.get(serializeTraceEvidence(phone));
        if (!canonical) throw new Error("Morphology root phone metadata is outside the configured inventory");
        return canonical;
      });
    }
  }
}

/** Verify configured execution from the recorded root; root generation and plan sampling are separate. */
export function replayMorphologyPreparation(word: Word, configuration: LanguageConfig) {
  const record = word.trace?.morphologyPreparation;
  const planned = word.trace?.morphology;
  if (!record || !planned || record.version !== 1) throw new Error("Morphology preparation unavailable");
  const template = record.template;
  if (template !== planned.template || !["bare", "prefixed", "suffixed", "both"].includes(template)) {
    throw new Error("Morphology template mismatch");
  }
  const config = structuredClone(configuration);
  const plan: MorphologyPlan = { template: template as MorphologyPlan["template"] };
  for (const part of ["prefix", "suffix"] as const) {
    const index = record.configurationIndices[part];
    const required = template === "both" || template === (part === "prefix" ? "prefixed" : "suffixed");
    if (required !== (index !== undefined)) throw new Error("Morphology affix presence mismatch");
    if (index === undefined) continue;
    const pool = part === "prefix" ? config.morphology?.prefixes : config.morphology?.suffixes;
    if (!Number.isSafeInteger(index) || index < 0 || !pool?.[index] || pool[index].written !== planned[part]) {
      throw new Error("Morphology configured affix mismatch");
    }
    plan[part] = pool[index];
  }
  restoreMorphologyRegexState(plan, record.regexBefore);
  const restoredRoot = structuredClone(record.before);
  if (config.morphology?.morphophonemicPolicy?.preserveClusterLegality) restoreRootInventoryPhones(restoredRoot, config);
  const ledger = new FinalPhones();
  const ids = ledger.register("root", restoredRoot.syllables);
  if (serializeTraceEvidence(ledger.snapshot(ids, record.before.syllables)) !== serializeTraceEvidence(record.phonesBefore)) {
    throw new Error("Morphology initial phone identities mismatch");
  }
  let cursor = 0;
  const trace = new TraceCollector();
  const context: WordGenerationContext = {
    word: restoredRoot, trace, syllableCount: record.before.syllables.length, currSyllableIndex: 0,
    finalPhoneState: { ledger, ids }, rand: () => {
      const value = record.rolls[cursor++];
      if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error("Invalid preparation draw tape");
      return value;
    },
  };
  const runtime = { config, ...(config.morphology?.morphophonemicPolicy?.preserveClusterLegality
    ? { evaluateMorphophonemicReplacement: bindMorphophonemicGuard(buildClusterRuntime(config)) } : {}) };
  const prepared = prepareMorphology(runtime, context, plan);
  if (cursor !== record.rolls.length) throw new Error("Unused preparation draws");
  if (serializeTraceEvidence(trace.morphologyPreparation) !== serializeTraceEvidence(record)) {
    throw new Error("Morphology preparation replay mismatch");
  }
  return { config, context, plan, prepared };
}
