import { serializeTraceEvidence } from "./trace-evidence.js";
import type { Phoneme, Syllable } from "../types.js";

export type PhonePart = "root" | "prefix" | "suffix";
export type PhoneSegment = "onset" | "nucleus" | "coda";
export type PhoneIdentitySyllable = Record<PhoneSegment, number[]>;
export type FinalPhoneSource =
  | { kind: "segment"; part: PhonePart; syllable: number; segment: PhoneSegment; index: number }
  | { kind: "flat-affix"; part: "prefix" | "suffix"; index: number }
  | { kind: "bridge"; boundary: "prefix-root" | "root-suffix" };
export interface FinalPhoneIdentity { id: number; initialSound: string; initialPhone?: Phoneme; source: FinalPhoneSource }
export interface FinalPhoneChange { id: number; before: string; after: string; rule: string }
export interface PhoneRealizationChange { changeIndex: number; id: number; before: Phoneme; after: Phoneme; rule: string }
export interface FinalPhoneTrace {
  realization: PhoneRealizationChange[];
  version: 1;
  initial: FinalPhoneIdentity[];
  changes: FinalPhoneChange[];
  final: { id: number; sound: string; syllable: number; segment: PhoneSegment; index: number }[];
}
const segments: readonly PhoneSegment[] = ["onset", "nucleus", "coda"];

function copyPhone(phone: Phoneme): Phoneme {
  // Preserve custom structured metadata while avoiding native serialization for scalar inventories.
  return Object.values(phone).some(value => value !== null && typeof value === "object")
    ? structuredClone(phone) : { ...phone };
}


/** A parallel identity structure follows the same actual segment operations. */
export class FinalPhones {
  static restore(trace: FinalPhoneTrace, syllables: readonly Syllable[]): { ledger: FinalPhones; ids: PhoneIdentitySyllable[] } {
    replayFinalPhones(trace);
    const ledger = new FinalPhones();
    ledger.initial = structuredClone(trace.initial);
    ledger.sounds = trace.initial.map(phone => phone.initialSound);
    ledger.changes = structuredClone(trace.changes);
    ledger.realization = structuredClone(trace.realization);
    for (const change of trace.changes) ledger.sounds[change.id] = change.after;
    const ids: PhoneIdentitySyllable[] = syllables.map(() => ({ onset: [], nucleus: [], coda: [] }));
    for (const phone of trace.final) {
      if (!ids[phone.syllable] || ids[phone.syllable][phone.segment].length !== phone.index) throw new Error("Invalid restored phone position");
      ids[phone.syllable][phone.segment].push(phone.id);
    }
    if (serializeTraceEvidence(ledger.snapshot(ids, syllables)) !== serializeTraceEvidence(trace)) throw new Error("Restored phone snapshot mismatch");
    return { ledger, ids };
  }

  private initial: FinalPhoneIdentity[] = [];
  private sounds: string[] = [];
  private changes: FinalPhoneChange[] = [];
  private realization: PhoneRealizationChange[] = [];

  add(sound: string, source: FinalPhoneSource, initialPhone?: Phoneme): number {
    const id = this.initial.length;
    if (initialPhone && initialPhone.sound !== sound) throw new Error("Initial phone sound mismatch");
    this.initial.push({ id, initialSound: sound, ...(initialPhone ? { initialPhone: structuredClone(initialPhone) } : {}), source: structuredClone(source) });
    this.sounds.push(sound);
    return id;
  }

  register(part: PhonePart, syllables: readonly Syllable[]): PhoneIdentitySyllable[] {
    return syllables.map((syllable, position) => {
      const ids: PhoneIdentitySyllable = { onset: [], nucleus: [], coda: [] };
      for (const segment of segments) ids[segment] = syllable[segment].map((phone, index) =>
        this.add(phone.sound, { kind: "segment", part, syllable: position, segment, index }, phone));
      return ids;
    });
  }

  replace(id: number, before: string, after: string, rule: string): void {
    if (!Number.isSafeInteger(id) || id < 0 || id >= this.sounds.length || this.sounds[id] !== before) {
      throw new Error("Final phone replacement does not match identity");
    }
    this.changes.push({ id, before, after, rule });
    this.sounds[id] = after;
  }

  realize(id: number, before: Phoneme, after: Phoneme, rule: string): void {
    const changeIndex = this.changes.length;
    this.replace(id, before.sound, after.sound, rule);
    this.realization.push(structuredClone({ changeIndex, id, before, after, rule }));
  }

  snapshot(ids: readonly PhoneIdentitySyllable[], syllables: readonly Syllable[]): FinalPhoneTrace {
    if (ids.length !== syllables.length) throw new Error("Final phone syllable mismatch");
    const seen = new Set<number>();
    const final: FinalPhoneTrace["final"] = [];
    for (const [syllable, shape] of ids.entries()) for (const segment of segments) {
      if (shape[segment].length !== syllables[syllable][segment].length) throw new Error("Final phone segment mismatch");
      for (const [index, id] of shape[segment].entries()) {
        if (!Number.isSafeInteger(id) || id < 0 || id >= this.initial.length || seen.has(id)) throw new Error("Final phone identity mismatch");
        seen.add(id);
        const sound = syllables[syllable][segment][index].sound;
        if (sound !== this.sounds[id]) throw new Error("Unrecorded final phone change");
        final.push({ id, sound, syllable, segment, index });
      }
    }
    if (seen.size !== this.initial.length) throw new Error("Unaccounted final phone");
    return { version: 1,
      initial: this.initial.map(phone => ({ ...phone, source: { ...phone.source },
        ...(phone.initialPhone ? { initialPhone: copyPhone(phone.initialPhone) } : {}) })),
      changes: this.changes.map(change => ({ ...change })),
      realization: this.realization.map(change => ({ ...change, before: copyPhone(change.before), after: copyPhone(change.after) })),
      final };
  }
}


/** Validates internal sound lineage; initial sources and rule eligibility need separate authentication. */
export function replayFinalPhones(trace: FinalPhoneTrace): string[] {
  const require = (condition: unknown, detail: string): void => {
    if (!condition) throw new Error(`Invalid final phones: ${detail}`);
  };
  require(trace.version === 1, "version");
  const sounds = trace.initial.map((phone, id) => {
    require(phone.id === id && typeof phone.initialSound === "string", "initial identity");
    return phone.initialSound;
  });
  for (const change of trace.changes) {
    require(Number.isSafeInteger(change.id) && change.id >= 0 && change.id < sounds.length, "change identity");
    require(sounds[change.id] === change.before, "change source");
    sounds[change.id] = change.after;
  }
  require(trace.realization.length <= trace.changes.length, "realization count");
  let previousChange = -1;
  trace.realization.forEach(change => {
    require(Number.isSafeInteger(change.changeIndex) && change.changeIndex > previousChange &&
      change.changeIndex < trace.changes.length, "realization order");
    previousChange = change.changeIndex;
    const actual = trace.changes[change.changeIndex];
    require(actual.id === change.id && actual.rule === change.rule && actual.before === change.before.sound &&
      actual.after === change.after.sound, "realization correspondence");
  });
  const seen = new Set<number>();
  let previous: { syllable: number; segment: number; index: number } | undefined;
  const result = trace.final.map(phone => {
    require(Number.isSafeInteger(phone.id) && phone.id >= 0 && phone.id < sounds.length && !seen.has(phone.id), "final identity");
    seen.add(phone.id);
    require(sounds[phone.id] === phone.sound, "final sound");
    const segment = segments.indexOf(phone.segment);
    require(Number.isSafeInteger(phone.syllable) && phone.syllable >= 0 && segment >= 0 &&
      Number.isSafeInteger(phone.index) && phone.index >= 0, "final position");
    if (previous && previous.syllable === phone.syllable && previous.segment === segment) {
      require(phone.index === previous.index + 1, "segment order");
    } else {
      require(phone.index === 0 && (!previous || phone.syllable > previous.syllable ||
        phone.syllable === previous.syllable && segment > previous.segment), "segment boundary");
    }
    previous = { syllable: phone.syllable, segment, index: phone.index };
    return phone.sound;
  });
  require(seen.size === sounds.length, "missing identity");
  return result;
}
