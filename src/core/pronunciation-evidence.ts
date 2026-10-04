import { resolveFinalVowels } from "./final-vowel.js";
import { replayFinalNuclei } from "./final-nucleus-evidence.js";
import { serializeTraceEvidence } from "./trace-evidence.js";
import { FinalPhones, type PhoneIdentitySyllable } from "./final-phones.js";
import { resolveAspirationRules, type LanguageConfig } from "../config/language.js";
import type { Word } from "../types.js";
import { generatePronunciation, type PronunciationPassTrace, type PronunciationRuntimeConfig, type PronunciationObserver } from "./pronounce.js";
import { TraceCollector } from "./trace.js";
import type { WordGenerationContext } from "../types.js";

/** Production-rule replay of a pass and its exact draw tape, not independent probability validation. */
export function verifyPronunciationPass(record: PronunciationPassTrace, config: PronunciationRuntimeConfig, observe?: PronunciationObserver): void {
  if (record.version !== 1) throw new Error("Invalid pronunciation evidence version");
  let cursor = 0;
  const context: WordGenerationContext = {
    rand: () => {
      const value = record.rolls[cursor++];
      if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error("Invalid pronunciation draw tape");
      return value;
    },
    word: { syllables: structuredClone(record.before), written: { clean: "", hyphenated: "" }, pronunciation: "" },
    syllableCount: record.before.length, currSyllableIndex: 0, trace: new TraceCollector(),
  };
  generatePronunciation(context, config, observe);
  if (cursor !== record.rolls.length) throw new Error("Unused pronunciation draws");
  if (serializeTraceEvidence(context.trace!.pronunciationPasses![0]) !== serializeTraceEvidence(record)) {
    throw new Error("Pronunciation rule replay mismatch");
  }
}


export function verifyWordPronunciation(word: Word, config: LanguageConfig): { ledger: FinalPhones; ids: PhoneIdentitySyllable[] } {
  const trace = word.trace;
  const passes = trace?.pronunciationPasses;
  if (!trace?.baseSpelling || !passes) throw new Error("Pronunciation source evidence unavailable");
  if (word.lexical) {
    if (passes.length !== 1) throw new Error("Lexical pronunciation pass count mismatch");
    const { context, root } = replayFinalNuclei(word, config);
    const source = root.flatMap((syllable, syllableIndex) =>
      (["onset", "nucleus", "coda"] as const).flatMap(segment => syllable[segment].map((phone, segmentIndex) =>
        ({ phone, syllableIndex, segment, segmentIndex, stress: syllable.stress }))));
    if (source.length !== trace.baseSpelling.phones.length) throw new Error("Lexical writer phone count mismatch");
    source.forEach((entry, index) => {
      const phone = trace.baseSpelling!.phones[index];
      if (phone.syllableIndex !== entry.syllableIndex || phone.segment !== entry.segment || phone.segmentIndex !== entry.segmentIndex ||
          phone.soundAtSpelling !== entry.phone.sound || (phone.boundary &&
          serializeTraceEvidence(phone.boundary) !== serializeTraceEvidence({ phoneme: entry.phone, stress: entry.stress }))) {
        throw new Error("Lexical writer phone mismatch");
      }
    });
    const pass = passes[0];
    if (serializeTraceEvidence(pass.before) !== serializeTraceEvidence(context.word.syllables)) throw new Error("Lexical pronunciation input mismatch");
    const state = context.finalPhoneState!;
    verifyPronunciationPass(pass, { aspiration: resolveAspirationRules(config.pronunciation?.aspiration),
      vowelReduction: config.pronunciation?.vowelReduction, finalVowels: resolveFinalVowels(config.finalNucleus) }, change => {
      state.ledger.realize(state.ids[change.syllableIndex][change.segment][change.index], change.before, change.after, change.rule);
    });
    if (serializeTraceEvidence(pass.after) !== serializeTraceEvidence(word.syllables) || pass.pronunciation !== word.pronunciation) {
      throw new Error("Lexical pronunciation output mismatch");
    }
    if (serializeTraceEvidence(state.ledger.snapshot(state.ids, word.syllables)) !== serializeTraceEvidence(trace.finalWord?.phones)) {
      throw new Error("Lexical final phone lineage mismatch");
    }
    return state;
  }
  const expectedCount = trace.morphology?.realization ? 2 : 1;
  if (passes.length !== expectedCount) throw new Error("Pronunciation pass count mismatch");
  const runtime = { aspiration: resolveAspirationRules(config.pronunciation?.aspiration),
    vowelReduction: config.pronunciation?.vowelReduction, finalVowels: resolveFinalVowels(config.finalNucleus) };
  const ledger = new FinalPhones();
  const ids = ledger.register("root", passes[0].before);
  for (const [index, pass] of passes.entries()) verifyPronunciationPass(pass, runtime, index === 0 ? change => {
    ledger.realize(ids[change.syllableIndex][change.segment][change.index], change.before, change.after, change.rule);
  } : undefined);
  const source = passes[0].before.flatMap((syllable, syllableIndex) =>
    (["onset", "nucleus", "coda"] as const).flatMap(segment => syllable[segment].map((phoneme, segmentIndex) =>
      ({ phoneme, syllableIndex, segment, segmentIndex, stress: syllable.stress }))));
  if (source.length !== trace.baseSpelling.phones.length) throw new Error("Pronunciation root count mismatch");
  source.forEach((entry, index) => {
    const base = trace.baseSpelling!.phones[index];
    const writer = trace.writerInput?.[base.syllableIndex];
    const writerPhone = writer?.[base.segment][base.segmentIndex];
    const boundary = base.boundary ?? (writerPhone ? { phoneme: writerPhone, stress: writer!.stress } : undefined);
    if (!boundary) throw new Error("Pronunciation writer features unavailable");
    if (boundary.phoneme.sound !== base.soundAtSpelling) throw new Error("Pronunciation writer sound mismatch");
    if (base.syllableIndex !== entry.syllableIndex || base.segment !== entry.segment || base.segmentIndex !== entry.segmentIndex ||
        serializeTraceEvidence(boundary) !== serializeTraceEvidence({ phoneme: entry.phoneme, stress: entry.stress })) {
      throw new Error("Pronunciation writer source mismatch");
    }
  });
  const final = passes[passes.length - 1];
  if (serializeTraceEvidence(final.after) !== serializeTraceEvidence(word.syllables) || final.pronunciation !== word.pronunciation) {
    throw new Error("Pronunciation final output mismatch");
  }
  return { ledger, ids };
}
