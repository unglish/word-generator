import { describe, expect, it } from "vitest";
import { englishConfig } from "../config/english.js";
import { completionConfiguration } from "./spelling-completion-config.js";
import { createCompletionCandidatePool } from "./spelling-completion-pool.js";
import { spellingBoundaryContexts } from "./spelling-context.js";

function fixture() {
  const config = structuredClone(englishConfig);
  config.splitVowels = { supports: [], routes: {
    syllable: { forms: [], probability: 0 }, word: { swaps: [], probability: 0, monosyllableMultiplier: 1 },
  }, completionWeights: [{ phoneme: "eɪ", form: "ai", startWord: 2 }] };
  return config;
}
const slot = spellingBoundaryContexts(["eɪ", "s", "ɛ", "t"].map((sound, id) => ({ id, part: "root", syllableIndex: id < 2 ? 0 : 1,
  segment: id % 2 === 0 ? "nucleus" : "coda", segmentIndex: 0, soundAtSpelling: sound,
  boundary: { phoneme: englishConfig.phonemes.find(phone => phone.sound === sound)! } })))[0].slot;

describe("opt-in completion positional support", () => {
  it("makes ai available in the formerly unsupported initial pool without changing the source config", () => {
    const config = fixture(); const before = structuredClone(config);
    const original = createCompletionCandidatePool(englishConfig)(slot, { doublingCount: 0 });
    expect(original).toMatchObject({ status: "available", proposals: [
      { form: "a", refusal: "unresolved-vowel-obligation" }, { form: "ae", refusal: "unsupported-reading" },
    ] });
    const result = createCompletionCandidatePool(config)(slot, { doublingCount: 0 });
    if (result.status !== "available") throw new Error("Expected pool");
    expect(result.proposals.find(proposal => proposal.form === "ai")).toMatchObject({ weight: 10 * 2 * (0.15 / 2), reading: { kind: "single-phone" } });
    expect(config).toEqual(before);
    expect(config.graphemes.find(grapheme => grapheme.phoneme === "eɪ" && grapheme.form === "ai")?.startWord).toBe(0);
  });
  it("preserves custom map exclusions while retaining cloned inventory identity", () => {
    const config = fixture();
    config.graphemeMaps.nucleus.set("eɪ", config.graphemeMaps.nucleus.get("eɪ")!.filter(grapheme => grapheme.form !== "ai"));
    const before = structuredClone(config);
    const result = createCompletionCandidatePool(config)(slot, { doublingCount: 0 });
    if (result.status !== "available") throw new Error("Expected pool");
    expect(result.proposals.some(proposal => proposal.form === "ai")).toBe(false);
    expect(config).toEqual(before);
    const completed = completionConfiguration(fixture());
    const inventory = completed.graphemes.find(grapheme => grapheme.phoneme === "eɪ" && grapheme.form === "ai")!;
    expect(completed.graphemeMaps.nucleus.get("eɪ")!.find(grapheme => grapheme.form === "ai")).toBe(inventory);
  });
  it("preserves unchanged configuration semantics when the option is absent", () => {
    expect(completionConfiguration(englishConfig)).toEqual(englishConfig);
  });
  it.each([-1, NaN, Infinity])("rejects invalid positional weight %s", weight => {
    const config = fixture(); config.splitVowels!.completionWeights![0].startWord = weight;
    expect(() => completionConfiguration(config)).toThrow("Invalid completion positional weight");
  });
  it("rejects unknown and duplicate support identities", () => {
    const config = fixture(); config.splitVowels!.completionWeights![0].form = "missing";
    expect(() => completionConfiguration(config)).toThrow("Ambiguous completion weight identity");
    const duplicate = fixture(); duplicate.splitVowels!.completionWeights!.push({ ...duplicate.splitVowels!.completionWeights![0] });
    expect(() => completionConfiguration(duplicate)).toThrow("Ambiguous completion weight identity");
  });
});
