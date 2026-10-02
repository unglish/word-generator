import { expect, it } from "vitest";
import { FinalPhones, replayFinalPhones } from "./final-phones.js";
import type { Syllable } from "../types.js";
import { englishConfig } from "../config/english.js";
const phone = (sound: string) => englishConfig.phonemes.find(item => item.sound === sound)!;
const root = (): Syllable[] => [{ onset: [phone("b")], nucleus: [phone("ɑ")], coda: [phone("t")] }];
it("preserves affix identity after a zero-syllable affix enters a root segment", () => {
  const syllables = root(); const ledger = new FinalPhones(); const ids = ledger.register("root", syllables);
  const affix = ledger.add("s", { kind: "flat-affix", part: "suffix", index: 0 });
  syllables[0].coda.push(phone("s")); ids[0].coda.push(affix);
  ledger.replace(ids[0].coda[0], "t", "d", "voicing"); syllables[0].coda[0] = phone("d");
  const trace = ledger.snapshot(ids, syllables);
  expect(trace.final.map(item => item.sound)).toEqual(["b", "ɑ", "d", "s"]);
  expect(trace.initial[trace.final[3].id].source).toEqual({ kind: "flat-affix", part: "suffix", index: 0 });
  expect(trace.changes).toEqual([{ id: 2, before: "t", after: "d", rule: "voicing" }]);
});
it("rejects unrecorded substitutions, reused identities and missing phones", () => {
  const syllables = root(); const ledger = new FinalPhones(); const ids = ledger.register("root", syllables);
  syllables[0].coda[0] = phone("d"); expect(() => ledger.snapshot(ids, syllables)).toThrow();
  syllables[0].coda[0] = phone("t"); ids[0].coda[0] = ids[0].onset[0];
  expect(() => ledger.snapshot(ids, syllables)).toThrow();
  ids[0].coda = []; syllables[0].coda = [];
  expect(() => ledger.snapshot(ids, syllables)).toThrow();
});

it("replays sound changes and rejects missing or altered realization", () => {
  const syllables = root(); const ledger = new FinalPhones(); const ids = ledger.register("root", syllables);
  ledger.realize(2, phone("t"), phone("d"), "test-realization"); syllables[0].coda[0] = phone("d");
  const trace = ledger.snapshot(ids, syllables);
  expect(replayFinalPhones(trace)).toEqual(["b", "ɑ", "d"]);
  const changed = structuredClone(trace); changed.changes = [];
  expect(() => replayFinalPhones(changed)).toThrow();
  const forged = structuredClone(trace); forged.realization[0].id = 0;
  expect(() => replayFinalPhones(forged)).toThrow();
  const lost = structuredClone(trace); lost.final.pop();
  expect(() => replayFinalPhones(lost)).toThrow();
});

it("replays interleaved pronunciation and morphological alternations", () => {
  const syllables = root(); const ledger = new FinalPhones(); const ids = ledger.register("root", syllables);
  ledger.realize(2, phone("t"), phone("d"), "first-pass");
  ledger.replace(2, "d", "t", "morphophonemic");
  ledger.realize(2, phone("t"), phone("d"), "second-pass");
  syllables[0].coda[0] = phone("d");
  const trace = ledger.snapshot(ids, syllables);
  expect(trace.realization.map(change => change.changeIndex)).toEqual([0, 2]);
  expect(replayFinalPhones(trace)).toEqual(["b", "ɑ", "d"]);
});

it("detaches scalar and structured phone metadata in snapshots", () => {
  const syllables = root();
  const custom = { ...syllables[0].onset[0], metadata: { values: [1, 2] } };
  syllables[0].onset[0] = custom;
  const ledger = new FinalPhones(); const ids = ledger.register("root", syllables);
  const after = { ...custom, aspirated: true };
  ledger.realize(ids[0].onset[0], custom, after, "test"); syllables[0].onset[0] = after;
  const expected = ledger.snapshot(ids, syllables);
  const snapshot = ledger.snapshot(ids, syllables);
  (snapshot.initial[0].initialPhone as typeof custom).metadata.values.push(3);
  (snapshot.realization[0].before as typeof custom).metadata.values.length = 0;
  snapshot.realization[0].after.sound = "x";
  snapshot.initial[0].source = { kind: "bridge", boundary: "root-suffix" };
  snapshot.changes[0].after = "x";
  snapshot.final[0].sound = "x";
  expect(ledger.snapshot(ids, syllables)).toEqual(expected);
});
