import { expect, it } from "vitest";
import { englishConfig } from "../config/english.js";
import { BaseSpelling, createSplitSpellingRuntime } from "./base-spelling.js";

const routes = {
  syllable: { forms: [], probability: 0 },
  word: { swaps: [], probability: 0, monosyllableMultiplier: 1 },
};

function ledger(version: 2 | 3 | 4 | 5) {
  const metadata = { values: [1, 2], date: new Date("2020-01-01"), view: new Uint8Array([3, 4]) };
  const phoneme = { ...englishConfig.phonemes[0], metadata };
  const phones = [0, 1].map(id => ({ id, part: "root" as const, syllableIndex: 0,
    segment: "onset" as const, segmentIndex: id, soundAtSpelling: phoneme.sound,
    boundary: { phoneme, stress: "ˈ" } }));
  const splitRuntime = version === 5 ? createSplitSpellingRuntime(englishConfig, [], routes, []) : undefined;
  const state = new BaseSpelling(phones, true, true, version >= 3,
    version >= 4 ? [] : undefined, englishConfig, undefined, splitRuntime);
  state.appendChoice(0, "b", "b", 0, 0);
  state.appendChoice(1, "b", "b", 0, 0);
  if (splitRuntime) {
    state.setPhase("syllable");
    const attempt = splitRuntime.planner.decide(state.constructionState(), 0, "syllable", () => 0.5);
    state.recordSplitAttempt(attempt);
  }
  return { state, metadata };
}

it.each([2, 3, 4, 5] as const)("detaches version %s snapshots while retaining aliases and custom metadata", version => {
  const { state, metadata } = ledger(version);
  const snapshot = state.snapshot();
  const second = state.snapshot();
  const expected = structuredClone(snapshot);
  expect(snapshot.version).toBe(version);
  const firstPhone = snapshot.phones[0].boundary!.phoneme as typeof englishConfig.phonemes[number] & { metadata: typeof metadata };
  const otherPhone = snapshot.phones[1].boundary!.phoneme;
  expect(firstPhone).toBe(otherPhone);
  expect(firstPhone.metadata).not.toBe(metadata);
  expect(firstPhone.metadata.date).toEqual(metadata.date);
  expect(firstPhone.metadata.view).toEqual(metadata.view);

  metadata.values.push(5);
  metadata.date.setUTCFullYear(2021);
  metadata.view[0] = 9;
  expect(snapshot).toEqual(expected);
  firstPhone.metadata.values.length = 0;
  firstPhone.metadata.view[0] = 8;
  snapshot.units[0].sourceCellIds.push(99);
  snapshot.cells[0].text = "x";
  expect(second).toEqual(expected);
  expect(state.current().cells[0].text).toBe("b");
  state.edit(0, 1, "p", "probe");
  expect(second).toEqual(expected);
});

it("detaches nonempty version-5 additions from later snapshots and the live ledger", () => {
  const { state } = ledger(5);
  const first = state.snapshot();
  const second = state.snapshot();
  expect(first.version).toBe(5);
  expect(second.version).toBe(5);
  if (first.version !== 5 || second.version !== 5) throw new Error("Missing split evidence");
  expect(first.split.attempts).toHaveLength(1);
  const expected = structuredClone(second);
  first.split.attempts[0].attempt.cursor.nextEditId = 999;
  first.split.attempts.pop();
  first.shared.timeline.length = 0;
  expect(second).toEqual(expected);
  expect(state.snapshot()).toEqual(expected);
});
