import type { Phoneme, Syllable, WordGenerationContext } from "../types.js";
import type { StressRules } from "../config/language.js";
import type { FinalPhoneTrace } from "./final-phones.js";
import type { RepairTrace } from "./trace.js";
import { repairStressedNuclei } from "./stress-repair.js";

export interface FinalNucleusTrace {
  version: 1;
  before: Syllable[];
  after: Syllable[];
  rootBefore: Syllable[];
  rootAfter: Syllable[];
  rootSyllableStart: number;
  rolls: number[];
  repairs: RepairTrace[];
  phonesBefore?: FinalPhoneTrace;
  phonesAfter?: FinalPhoneTrace;
}

export function repairFinalNuclei(context: WordGenerationContext, lexicalRoot: Syllable[], rootSyllableStart: number,
  pool: Phoneme[], stress: StressRules): void {
  const trace = context.trace;
  const before = trace ? structuredClone(context.word.syllables) : undefined;
  const rootBefore = trace ? structuredClone(lexicalRoot) : undefined;
  const phonesBefore = context.finalPhoneState?.ledger.snapshot(context.finalPhoneState.ids, context.word.syllables);
  const repairStart = trace?.repairs.length ?? 0;
  const rolls: number[] = [];
  const active = trace ? { ...context, rand: () => {
    const value = context.rand(); rolls.push(value); return value;
  } } : context;
  const nucleiBeforeRepair = context.word.syllables.map(syllable => [...syllable.nucleus]);
  repairStressedNuclei(active, pool, stress);
  if (context.finalPhoneState) {
    const { ledger, ids } = context.finalPhoneState;
    context.word.syllables.forEach((syllable, syllableIndex) => syllable.nucleus.forEach((phone, index) => {
      const prior = nucleiBeforeRepair[syllableIndex][index];
      if (phone !== prior) ledger.realize(ids[syllableIndex].nucleus[index], prior, phone, "repairFinalStressedNuclei");
    }));
  }
  for (let rootIndex = 0; rootIndex < lexicalRoot.length; rootIndex++) {
    const finalIndex = rootSyllableStart + rootIndex;
    const finalNucleus = context.word.syllables[finalIndex].nucleus;
    for (let index = 0; index < finalNucleus.length; index++) {
      if (finalNucleus[index] !== nucleiBeforeRepair[finalIndex][index]) {
        lexicalRoot[rootIndex].nucleus[index] = { ...finalNucleus[index] };
      }
    }
  }
  if (trace) trace.finalNucleus = { version: 1, before: before!, after: structuredClone(context.word.syllables),
    rootBefore: rootBefore!, rootAfter: structuredClone(lexicalRoot), rootSyllableStart, rolls,
    repairs: structuredClone(trace.repairs.slice(repairStart)), phonesBefore,
    phonesAfter: context.finalPhoneState?.ledger.snapshot(context.finalPhoneState.ids, context.word.syllables) };
}
