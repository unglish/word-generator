import { buildGraphemeMaps } from "../elements/graphemes/index.js";
import { spellingBoundaryContexts } from "./spelling-context.js";
import { createSpellingCoveragePlanner } from "./spelling-coverage.js";
import { describe, expect, it } from "vitest";
import { englishConfig } from "../config/english.js";
import { createSharedConstructionPlanner } from "./spelling-construction.js";
import { BaseSpelling } from "./base-spelling.js";
import { createCompletionPrefixResolver, createCompletionNeighborPrefixResolver } from "./spelling-completion-prefix.js";

function fixture(onset = true) {
  const entries = [...(onset ? [{ sound: "t", form: "tt", segment: "onset" as const, increment: 1 }] : []),
    { sound: "eɪ", form: "a", segment: "nucleus" as const, increment: 0 }];
  const base = new BaseSpelling(entries.map((entry, id) => ({ id, part: "root", syllableIndex: 0,
    segment: entry.segment, segmentIndex: 0, soundAtSpelling: entry.sound,
    boundary: { phoneme: structuredClone(englishConfig.phonemes.find(phone => phone.sound === entry.sound)!) } })), true, true, true);
  entries.forEach((entry, id) => base.appendChoice(id, entry.form, entry.form, id, entry.increment));
  return base;
}
const resolve = createCompletionPrefixResolver(englishConfig);
describe("completion prefix evidence", () => {
  it("uses the complete current preceding form and recorded doubling count", () => {
    expect(resolve(fixture().constructionState(), 1)).toEqual({ status: "available", prefix: { previousForm: "tt", doublingCount: 1 },
      evidence: { doublingCount: 1, quotaSource: "original" } });
  });
  it("supports a word-initial nucleus without inventing a preceding form", () => {
    expect(resolve(fixture(false).constructionState(), 0)).toMatchObject({ status: "available", prefix: { doublingCount: 0 } });
  });
  it("uses the recorded written boundary after an opaque rewrite without inventing ownership", () => {
    const base = fixture(); base.edit(0, 2, "t", "opaque", 0);
    const view = base.constructionState(); const before = structuredClone(view);
    expect(resolve(view, 1)).toMatchObject({ status: "available", prefix: { previousForm: "t", doublingCount: 1 },
      evidence: { quotaSource: "original", writtenBoundaryCellId: 3 } });
    expect(view).toEqual(before);
  });
  it("uses the actual inserted boundary letter rather than crossing it to the source unit", () => {
    const base = fixture(); base.edit(2, 0, "e", "marker", 0);
    expect(resolve(base.constructionState(), 1)).toMatchObject({ status: "available", prefix: { previousForm: "e", doublingCount: 1 },
      evidence: { writtenBoundaryCellId: 3 } });
  });
  it("retains missing and partial preceding-unit refusals", () => {
    const missing = fixture(); missing.edit(0, 2, "", "deleted", 0);
    expect(resolve(missing.constructionState(), 1)).toEqual({ status: "unavailable", reason: "missing-unit" });
    const partial = structuredClone(fixture().constructionState()); partial.units[0].sourceCellIds.pop();
    expect(resolve(partial, 1)).toEqual({ status: "unavailable", reason: "partial-unit" });
  });
  it("uses the complete live qu construction rather than the old w selection", () => {
    const entries = [{ sound: "k", form: "c", segment: "onset" as const, segmentIndex: 0 },
      { sound: "w", form: "w", segment: "onset" as const, segmentIndex: 1 },
      { sound: "eɪ", form: "a", segment: "nucleus" as const, segmentIndex: 0 }];
    const reading = { doubling: undefined, graphemes: entries.map(entry => ({ phoneme: entry.sound,
      form: entry.form, frequency: 1, origin: 0, reading: { kind: "single-phone" as const } })) };
    const base = new BaseSpelling(entries.map((entry, id) => ({ id, part: "root", syllableIndex: 0,
      segment: entry.segment, segmentIndex: entry.segmentIndex, soundAtSpelling: entry.sound,
      boundary: { phoneme: structuredClone(englishConfig.phonemes.find(phone => phone.sound === entry.sound)!) } })),
    true, true, true, englishConfig.sharedSpellings, reading);
    entries.forEach((entry, id) => base.appendChoice(id, entry.form, entry.form, id, 0));
    const planner = createSharedConstructionPlanner(englishConfig.sharedSpellings!, reading);
    const slot = { phase: "word", partId: null } as const; base.setPhase("word");
    const attempt = planner.decide(base.constructionState(), slot, "cw-to-qu", [0, 1], () => { throw new Error("Unexpected draw"); });
    expect(base.recordSharedAttempt(slot, "cw-to-qu", [0, 1], attempt)).toBe(0);
    expect(resolve(base.constructionState(), 2)).toMatchObject({ status: "available", prefix: { previousForm: "qu", doublingCount: 0 },
      evidence: { sharedConstructionId: 0 } });
    const broken = structuredClone(base.constructionState()); broken.cells = broken.cells.slice(1);
    expect(resolve(broken, 2)).toEqual({ status: "unavailable", reason: "invalid-shared-prefix" });
    base.edit(2, 0, "u", "recorded-marker", 0);
    expect(resolve(base.constructionState(), 2)).toMatchObject({ status: "available",
      prefix: { previousForm: "u", doublingCount: 0 }, evidence: { writtenBoundaryCellId: 5 } });
  });
  it("uses an authenticated coverage replacement and its choice history", () => {
    const graphemes = [{ phoneme: "n", form: "nn" }, { phoneme: "eɪ", form: "a" }, { phoneme: "n", form: "n" }]
      .map(entry => ({ ...entry, frequency: 1, origin: 0, startWord: 1, midWord: 1, endWord: 1, reading: { kind: "single-phone" as const } }));
    const config = { ...englishConfig, graphemes, ...buildGraphemeMaps(graphemes), sharedSpellings: undefined, doubling: undefined,
      writtenFormConstraints: { policy: "preserve-phones" as const, maxConsonantLetters: 1 } };
    const phones = ["n", "eɪ"].map((sound, id) => ({ id, part: "root" as const, syllableIndex: 0,
      segment: id === 0 ? "onset" as const : "nucleus" as const, segmentIndex: 0, soundAtSpelling: sound,
      boundary: { phoneme: structuredClone(englishConfig.phonemes.find(phone => phone.sound === sound)!) } }));
    const base = new BaseSpelling(phones, true, true, true);
    base.appendChoice(0, "nn", "nn", 0, 0); base.appendChoice(1, "a", "a", 1, 0);
    const choices = spellingBoundaryContexts(phones).map((context, id) => ({ ...context, grapheme: graphemes[id], form: graphemes[id].form }));
    const coverage = createSpellingCoveragePlanner(config);
    expect(coverage.apply(base, choices, "base-before-word-rules").status).toBe("respell");
    expect(createCompletionPrefixResolver(config)(base.constructionState(), 1)).toMatchObject({ status: "available",
      prefix: { previousForm: "n", doublingCount: 0 }, evidence: { quotaSource: "coverage", certificateId: 0 } });
  });
  it("retains explicit missing quota-history failure", () => {
    const state = structuredClone(fixture().constructionState()); delete state.units[0].doublingIncrement;
    expect(resolve(state, 1)).toEqual({ status: "unavailable", reason: "missing-doubling-history" });
  });
});


it("authenticates a consonant prefix while retaining the nucleus-only resolver contract", () => {
  const state = fixture().constructionState();
  expect(createCompletionNeighborPrefixResolver(englishConfig)(state, 0)).toMatchObject({
    status: "available", prefix: { doublingCount: 0 }, evidence: { quotaSource: "original" },
  });
  expect(resolve(state, 0)).toEqual({ status: "unavailable", reason: "not-nucleus" });
  expect(createCompletionNeighborPrefixResolver(englishConfig)(state, 1)).toEqual({ status: "unavailable", reason: "not-consonant" });
});
