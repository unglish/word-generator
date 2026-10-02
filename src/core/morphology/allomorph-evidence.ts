import { replayMorphologyPreparation } from "./preparation-evidence.js";
import { serializeTraceEvidence } from "../trace-evidence.js";
import { verifyWordPronunciation } from "../pronunciation-evidence.js";
import { replayFinalPhones } from "../final-phones.js";
import type { Phoneme } from "../../types.js";
import type { LanguageConfig, PhonologicalCondition } from "../../config/language.js";
import type { Word } from "../../types.js";
import { snapshotAffixForm, type AllomorphBoundaryPhoneme } from "./realization.js";

function matches(condition: PhonologicalCondition, phone: AllomorphBoundaryPhoneme, prefix: boolean): boolean {
  return !(condition.position === "preceding" && prefix || condition.position === "following" && !prefix) &&
    (!condition.sounds || condition.sounds.includes(phone.sound)) &&
    (condition.voiced === undefined || condition.voiced === phone.voiced) &&
    (!condition.manner || condition.manner.includes(phone.mannerOfArticulation)) &&
    (!condition.place || condition.place.includes(phone.placeOfArticulation));
}

function boundaryFeatures(phone: Phoneme | undefined): AllomorphBoundaryPhoneme | undefined {
  return phone ? { sound: phone.sound, voiced: phone.voiced, mannerOfArticulation: phone.mannerOfArticulation,
    placeOfArticulation: phone.placeOfArticulation } : undefined;
}

/** Binds selection features to the base writer boundary and recorded root realization. */
export function verifyConfiguredAllomorphs(word: Word, config: LanguageConfig): void {
  const require = (condition: unknown, detail: string): void => {
    if (!condition) throw new Error(`Invalid allomorph evidence: ${detail}`);
  };
  const rootState = verifyWordPronunciation(word, config);
  const realization = word.trace?.morphology?.realization;
  if (!realization) {
    require(!word.trace?.morphology || word.trace.morphology.template === "bare", "missing realization");
    return;
  }
  const selection = realization.selectionPhones;
  if (!selection || !word.trace?.baseSpelling) throw new Error("Allomorph boundary source unavailable");
  replayFinalPhones(selection);
  let states: Phoneme[];
  if (word.lexical) {
    const replayed = replayMorphologyPreparation(word, config);
    require(serializeTraceEvidence(selection) === serializeTraceEvidence(replayed.prepared?.selectionPhones), "selection phone lineage");
    states = selection.initial.map(phone => {
      const source = phone.source;
      if (source.kind !== "segment" || source.part !== "root") throw new Error("Invalid lexical selection source");
      const actual = word.trace!.morphologyPreparation!.before.syllables[source.syllable]?.[source.segment][source.index];
      require(serializeTraceEvidence(actual) === serializeTraceEvidence(phone.initialPhone), "lexical selection features");
      return structuredClone(actual);
    });
  } else {
  const expectedSelection = rootState.ledger.snapshot(rootState.ids, word.trace!.pronunciationPasses![0].after);
  require(serializeTraceEvidence(selection) === serializeTraceEvidence(expectedSelection), "selection phone lineage");
  states = selection.initial.map(phone => {
    const source = phone.source;
    require(source.kind === "segment" && source.part === "root", "selection contains non-root source");
    if (source.kind !== "segment") throw new Error("Invalid root source");
    const base = word.trace!.baseSpelling!.phones.find(item => item.syllableIndex === source.syllable &&
      item.segment === source.segment && item.segmentIndex === source.index);
    const writer = word.trace!.writerInput?.[source.syllable]?.[source.segment][source.index];
    const features = base?.boundary?.phoneme ?? writer;
    if (!base || !features || !phone.initialPhone) throw new Error("Allomorph boundary features unavailable");
    require(features.sound === base.soundAtSpelling, "writer source sound");
    require(phone.initialSound === phone.initialPhone.sound && serializeTraceEvidence(features) ===
      serializeTraceEvidence(phone.initialPhone), "writer boundary features");
    return structuredClone(phone.initialPhone);
  });
  require(selection.changes.length === selection.realization.length, "unlicensed pre-selection change");
  selection.realization.forEach((change, index) => {
    require(change.changeIndex === index && serializeTraceEvidence(states[change.id]) === serializeTraceEvidence(change.before), "realization feature chain");
    states[change.id] = structuredClone(change.after);
  });
  const realizedRoot = word.trace!.pronunciationPasses![0].after;
  for (const phone of selection.final) {
    const actual = realizedRoot[phone.syllable]?.[phone.segment][phone.index];
    require(serializeTraceEvidence(states[phone.id]) === serializeTraceEvidence(actual), "pre-attachment realization source");
  }
  }
  for (const part of ["prefix", "suffix"] as const) {
    const selected = realization[part];
    const index = realization.configurationIndices?.[part];
    if (!selected) { require(index === undefined, "index without affix"); continue; }
    const inventory = part === "prefix" ? config.morphology?.prefixes : config.morphology?.suffixes;
    require(index !== undefined && Number.isSafeInteger(index) && index >= 0 && index < (inventory?.length ?? 0), "configured identity");
    const affix = inventory![index!];
    require(serializeTraceEvidence(snapshotAffixForm(affix)) === serializeTraceEvidence(selected.planned), "planned form");
    require(word.trace!.morphology![part] === affix.written, "planned spelling");
    const edge = part === "prefix" ? selection.final[0] : selection.final.at(-1);
    const expectedBoundary = boundaryFeatures(edge ? states[edge.id] : undefined);
    require(serializeTraceEvidence(selected.boundaryPhoneme) === serializeTraceEvidence(expectedBoundary), "selection boundary features");
    const phone = expectedBoundary;
    const variants = (affix.allomorphs ?? []).map((variant, originalIndex) => ({ variant, originalIndex }));
    variants.sort((a, b) => Number(!(a.variant.phonologicalCondition.manner || a.variant.phonologicalCondition.place)) -
      Number(!(b.variant.phonologicalCondition.manner || b.variant.phonologicalCondition.place)));
    const winner = phone ? variants.find(({ variant }) => matches(variant.phonologicalCondition, phone, part === "prefix")) : undefined;
    require(selected.allomorphIndex === (winner?.originalIndex ?? null), "selection priority");
    const expected = winner ? { ...winner.variant, written: winner.variant.written ?? affix.written } : affix;
    require(serializeTraceEvidence(snapshotAffixForm(expected)) === serializeTraceEvidence(selected.resolved), "resolved form");
  }
}
