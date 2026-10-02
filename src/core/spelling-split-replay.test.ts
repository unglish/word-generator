import { describe, expect, it } from "vitest";
import { buildGraphemeMaps } from "../elements/graphemes/index.js";
import { englishConfig } from "../config/english.js";
import { BaseSpelling, createSplitSpellingRuntime } from "./base-spelling.js";
import { createSplitLedgerReplayer } from "./spelling-split-replay.js";
import type { GraphemeReading } from "../types.js";

function fixture(codaSound: string, codaForm: string, reading?: GraphemeReading, nucleusForm = "ai") {
  const entries = [{ sound: "t", form: "t", segment: "onset" as const, reading: { kind: "single-phone" as const } },
    { sound: "eɪ", form: nucleusForm, segment: "nucleus" as const, reading: { kind: "single-phone" as const } },
    { sound: codaSound, form: codaForm, segment: "coda" as const, reading }];
  const graphemes = entries.map(entry => ({ phoneme: entry.sound, form: entry.form, frequency: 1, origin: 0, reading: entry.reading }));
  const phones = entries.map((entry, id) => ({ id, part: "root" as const, syllableIndex: 0,
    segment: entry.segment, segmentIndex: 0, soundAtSpelling: entry.sound,
    boundary: { phoneme: structuredClone(englishConfig.phonemes.find(phone => phone.sound === entry.sound)!) } }));
  const runtime = createSplitSpellingRuntime({ graphemes, doubling: undefined },
    [{ vowel: { sound: "eɪ", component: "a" }, coda: { sounds: [codaSound], written: codaForm }, marker: "e" }],
    { syllable: { forms: ["ae"], probability: 95 }, word: { swaps: [{ phoneme: "eɪ", from: nucleusForm, to: "a" }], probability: 35, monosyllableMultiplier: 2 } }, []);
  const base = new BaseSpelling(phones, true, true, true, [], { graphemes, doubling: undefined }, undefined, runtime);
  entries.forEach((entry, id) => base.appendChoice(id, entry.form, entry.form, id, 0));
  base.setPhase("word");
  return { base, planner: runtime.planner };
}

function example() {
  const { base, planner } = fixture("t", "t", { kind: "single-phone" });
  const current = base.current();
  const config = { ...englishConfig, sharedSpellings: [], doubling: undefined,
    graphemes: current.units.map(unit => ({ phoneme: current.phones[unit.id].soundAtSpelling,
      form: unit.selected, frequency: 1, origin: 0, reading: { kind: "single-phone" as const } })) };
  Object.assign(config, buildGraphemeMaps(config.graphemes));
  const replay = createSplitLedgerReplayer(config,
    [{ vowel: { sound: "eɪ", component: "a" }, coda: { sounds: ["t"], written: "t" }, marker: "e" }],
    { syllable: { forms: ["ae"], probability: 95 }, word: { swaps: [{ phoneme: "eɪ", from: "ai", to: "a" }], probability: 35, monosyllableMultiplier: 2 } });
  base.recordSplitAttempt(planner.decide(base.constructionState(), 1, "word", () => 0));
  return { base, replay };
}
describe("v5 recorded-operation replay", () => {
  it.each(["none", "edit", "batch", "gap"])("reconstructs formation followed by %s", operation => {
    const { base, replay } = example();
    if (operation === "edit") { base.edit(3, 1, "", "refused", 0); base.edit(0, 1, "d", "allowed", 0); }
    if (operation === "batch") base.editBatch([{ start: 0, deleteCount: 1, insert: "d", rule: "onset", partId: 0 }]);
    if (operation === "gap") base.replaceWithGapSpelling("tate", "word", "fixture");
    const trace = base.snapshot(); if (trace.version !== 5) throw new Error("fixture");
    expect(replay(trace)).toMatchObject({ version: 5, splitConstructions: 1, writerSchedule: "unverified" });
  });
  it("rejects altered construction binding and omitted timeline references", () => {
    const { base, replay } = example(); const trace = base.snapshot(); if (trace.version !== 5) throw new Error("fixture");
    const forged = structuredClone(trace); forged.split.constructions[0].markerCellIds = [99];
    expect(() => replay(forged)).toThrow();
    trace.shared.timeline = trace.shared.timeline.filter(entry => entry.kind !== "split-attempt");
    expect(() => replay(trace)).toThrow();
  });
  it("distinguishes a single edit from a one-edit batch", () => {
    const { base, replay } = example(); base.editBatch([{ start: 0, deleteCount: 1, insert: "d", rule: "onset", partId: 0 }]);
    const trace = base.snapshot(); if (trace.version !== 5) throw new Error("fixture");
    trace.split.guards[0].operation = "edit";
    expect(() => replay(trace)).toThrow();
  });
});
