import { serializeTraceEvidence } from "./trace-evidence.js";
import type { Word } from "../types.js";
import { replayFinalSpelling } from "./final-spelling.js";
import { replayFinalPhones, type FinalPhoneSource } from "./final-phones.js";

/** Cross-record source binding; this does not authenticate configuration choices or rule eligibility. */
export function verifyFinalWordSourceLinks(word: Word): void {
  const require = (condition: unknown, detail: string): void => {
    if (!condition) throw new Error(`Invalid final source link: ${detail}`);
  };
  const trace = word.trace;
  if (!trace?.finalWord || !trace.baseSpelling) throw new Error("Final source evidence unavailable");
  const { spelling, phones } = trace.finalWord;
  require(replayFinalSpelling(spelling).map(cell => cell.text).join("") === word.written.clean, "surface");
  const expectedSounds = word.syllables.flatMap(syllable => [...syllable.onset, ...syllable.nucleus, ...syllable.coda].map(phone => phone.sound));
  require(serializeTraceEvidence(replayFinalPhones(phones)) === serializeTraceEvidence(expectedSounds), "final phones");
  const gap = trace.baseSpelling.edits.find(edit => edit.phase === "gap");
  const baseCells = gap?.input ?? trace.baseSpelling.cells;
  const roots = spelling.initial.filter(cell => cell.part === "root");
  require(roots.length === baseCells.length, "root cell count");
  roots.forEach((cell, index) => require(cell.source.kind === "base-cell" && cell.source.cellId === baseCells[index].id &&
    cell.text === baseCells[index].text, "base cell"));

  const rootSource = word.lexical ? trace.finalNucleus?.rootBefore : undefined;
  if (word.lexical && !rootSource) throw new Error("Lexical root source unavailable");
  const expected: { sound: string; source: FinalPhoneSource }[] = rootSource
    ? rootSource.flatMap((syllable, syllableIndex) => (["onset", "nucleus", "coda"] as const).flatMap(segment =>
      syllable[segment].map((phone, index) => ({ sound: phone.sound,
        source: { kind: "segment" as const, part: "root" as const, syllable: syllableIndex, segment, index } }))))
    : trace.baseSpelling.phones.map(phone => ({ sound: phone.soundAtSpelling,
      source: { kind: "segment", part: "root", syllable: phone.syllableIndex, segment: phone.segment, index: phone.segmentIndex } }));
  const realization = trace.morphology?.realization;
  for (const part of ["prefix", "suffix"] as const) {
    const form = realization?.[part]?.resolved;
    const cells = spelling.initial.filter(cell => cell.part === part);
    require(cells.map(cell => cell.text).join("") === (form?.written ?? ""), "resolved affix cells");
    cells.forEach((cell, offset) => require(cell.source.kind === "affix" && cell.source.offset === offset, "affix cell offset"));
    if (!form) continue;
    if (form.syllables?.length) {
      form.syllables.forEach((syllable, position) => {
        for (const segment of ["onset", "nucleus", "coda"] as const) syllable[segment].forEach((sound, index) =>
          expected.push({ sound, source: { kind: "segment", part, syllable: position, segment, index } }));
      });
    } else if (form.syllableCount === 0) {
      form.phonemes.forEach((sound, index) => expected.push({ sound, source: { kind: "flat-affix", part, index } }));
    }
  }
  const key = (source: FinalPhoneSource): string => serializeTraceEvidence(source)!;
  const expectedMap = new Map(expected.map(phone => [key(phone.source), phone.sound]));
  require(expectedMap.size === expected.length, "duplicate source coordinate");
  const actual = phones.initial.filter(phone => phone.source.kind !== "bridge");
  require(actual.length === expected.length, "source phone count");
  for (const phone of actual) {
    const source = key(phone.source);
    require(expectedMap.has(source) && expectedMap.get(source) === phone.initialSound, "source phone");
    expectedMap.delete(source);
  }
  require(expectedMap.size === 0, "missing source phone");
}
