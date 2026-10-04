import { expect, it } from "vitest";
import { englishConfig } from "../config/english.js";
import { BaseSpelling, createSplitSpellingRuntime } from "./base-spelling.js";
import type { SharedSpellingSlot } from "./spelling-construction.js";
import { createSharedConstructionPlanner } from "./spelling-construction.js";
import { englishSharedSpellings } from "../elements/graphemes/shared.js";

function ledger(version: 4 | 5) {
  const routes = {
    syllable: { forms: [], probability: 0 },
    word: { swaps: [], probability: 0, monosyllableMultiplier: 1 },
  };
  const split = version === 5 ? createSplitSpellingRuntime(englishConfig, [], routes, []) : undefined;
  const phoneme = englishConfig.phonemes.find(phone => phone.sound === "b");
  if (!phoneme) throw new Error("Missing fixture phoneme");
  const state = new BaseSpelling([{ id: 0, part: "root", syllableIndex: 0, segment: "onset",
    segmentIndex: 0, soundAtSpelling: "b", boundary: { phoneme, stress: "ˈ" } }],
  true, true, true, [], englishConfig, undefined, split);
  state.appendChoice(0, "b", "b", 0, 0);
  state.setPhase("syllable");
  return state;
}

it.each([4, 5] as const)("keeps version %s histories independent across records, snapshots and later ledger operations", version => {
  const state = ledger(version);
  const slot: SharedSpellingSlot = { phase: "syllable", partId: 0 };
  state.recordWriterStep("pass-start", slot);
  state.recordWriterStep("slot-start", slot, 0);
  const first = state.snapshot();
  const second = state.snapshot();
  if ((first.version !== 4 && first.version !== 5) || (second.version !== 4 && second.version !== 5)) throw new Error("Missing shared history");
  expect(first.version).toBe(version);
  expect(first.shared.writerSteps).toHaveLength(2);
  expect(first.shared.timeline).toHaveLength(3);
  const expected = structuredClone(second);
  const [start, next] = first.shared.writerSteps;
  expect(start.cursor).toEqual(next.cursor);
  expect(start.cursor).not.toBe(next.cursor);
  expect(start.slot).not.toBe(next.slot);
  expect(start.slot).not.toBe(slot);
  expect(start.cursor).not.toBe(first.shared.timeline[1].cursor);
  slot.partId = 7;
  start.cursor.nextEditId = 900;
  start.slot.partId = 8;
  first.shared.timeline[1].cursor.lastAppendedUnitId = 99;
  first.shared.timeline.pop();
  expect(next.slot.partId).toBe(0);
  expect(next.cursor.nextEditId).toBe(0);
  expect(second).toEqual(expected);
  state.edit(0, 1, "p", "later", 0);
  state.recordWriterStep("slot-end", { phase: "syllable", partId: 0 }, 0);
  expect(second).toEqual(expected);
  expect(state.snapshot()).not.toEqual(expected);
});

it("preserves native metadata, cycles and shared references on extended history slots", () => {
  const state = ledger(4);
  const metadata: { value: number; date: Date; view: Uint8Array; self?: unknown } = {
    value: 1, date: new Date("2020-01-01"), view: new Uint8Array([2, 3]),
  };
  metadata.self = metadata;
  const slot = { phase: "syllable" as const, partId: 0, metadata };
  state.recordWriterStep("pass-start", slot);
  state.recordWriterStep("pass-end", slot);
  const first = state.snapshot();
  const second = state.snapshot();
  if (first.version !== 4 || second.version !== 4) throw new Error("Missing shared history");
  const [start, end] = first.shared.writerSteps.map(step => step.slot as SharedSpellingSlot & { metadata: typeof metadata });
  const expected = structuredClone(second);
  expect(start.metadata).toBe(end.metadata);
  expect(start.metadata.self).toBe(start.metadata);
  expect(start.metadata).not.toBe(metadata);
  expect(start.metadata.date).toEqual(metadata.date);
  expect(start.metadata.view).toEqual(metadata.view);
  metadata.value = 8;
  metadata.view[0] = 7;
  start.metadata.date.setUTCFullYear(2021);
  expect(second).toEqual(expected);
});

it("keeps native omission of symbol keys on history slots", () => {
  const state = ledger(4);
  const token = Symbol("metadata");
  const slot = { phase: "syllable" as const, partId: 0, [token]: { value: 1 } };
  state.recordWriterStep("pass-start", slot);
  const snapshot = state.snapshot();
  if (snapshot.version !== 4) throw new Error("Missing shared history");
  expect(Reflect.ownKeys(snapshot.shared.writerSteps[0].slot)).toEqual(["phase", "partId"]);
});

it("keeps native cursor metadata semantics for accepted shared attempts", () => {
  const sounds = ["æ", "k", "s"];
  const forms = ["a", "ck", "s"];
  const graphemes = forms.map((form, id) => ({ phoneme: sounds[id], form, frequency: 1, origin: 0,
    startWord: 1, midWord: 1, endWord: 1, reading: { kind: "single-phone" as const } }));
  const state = new BaseSpelling(sounds.map((sound, id) => {
    const phoneme = englishConfig.phonemes.find(phone => phone.sound === sound);
    if (!phoneme) throw new Error("Missing fixture phoneme");
    return { id, part: "root" as const, syllableIndex: 0, segment: "onset" as const,
      segmentIndex: id, soundAtSpelling: sound, boundary: { phoneme } };
  }), true, true, true, englishSharedSpellings, { doubling: undefined, graphemes });
  forms.forEach((form, id) => state.appendChoice(id, form, form, id, 0));
  state.setPhase("word");
  const slot = { phase: "word", partId: null } as const;
  const planner = createSharedConstructionPlanner(englishSharedSpellings, { doubling: undefined, graphemes });
  const attempt = planner.decide(state.constructionState(), slot, "ks-to-x", [1, 2], () => 0);
  const token = Symbol("metadata");
  const cursor = attempt.cursor as typeof attempt.cursor & { [token]?: object; metadata?: undefined };
  cursor[token] = { value: 1 };
  cursor.metadata = undefined;
  expect(state.recordSharedAttempt(slot, "ks-to-x", [1, 2], attempt)).toBe(0);
  const first = state.snapshot();
  const second = state.snapshot();
  if (first.version !== 4 || second.version !== 4) throw new Error("Missing shared history");
  const timelineCursor = first.shared.timeline.find(entry => entry.kind === "shared")!.cursor;
  expect(Object.getOwnPropertySymbols(timelineCursor)).toEqual([]);
  expect(Object.hasOwn(timelineCursor, "metadata")).toBe(true);
  expect(timelineCursor).toEqual(first.shared.events[0].cursor);
  const expected = structuredClone(second);
  timelineCursor.nextEditId = 999;
  expect(second).toEqual(expected);
  expect(state.snapshot()).toEqual(expected);
});
