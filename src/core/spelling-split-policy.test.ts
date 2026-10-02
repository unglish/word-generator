import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { englishConfig } from "../config/english.js";
import { englishSplitVowelSupports } from "../elements/graphemes/split-vowels.js";
import { createSplitVowelPolicy, type SplitVowelContext, type SplitVowelRoutes } from "./spelling-split-policy.js";

const routes: SplitVowelRoutes = {
  syllable: { forms: ["ae", "ie", "oe", "ue", "ye"], probability: 95 },
  word: { swaps: englishConfig.silentE!.swaps, probability: 35, monosyllableMultiplier: 2 },
};
const context = (extra: Partial<SplitVowelContext> = {}): SplitVowelContext => ({
  vowel: { sound: "eɪ", form: "ai", position: "nucleus" }, coda: { sounds: ["t"], written: "t" },
  route: "word", finalRootSyllable: true, syllableCount: 1, ...extra,
});
const policy = createSplitVowelPolicy(englishSplitVowelSupports, routes);

describe("registered split-vowel reading policy", () => {
  it("matches every independently pinned example without broadening the table", () => {
    const evidence = JSON.parse(readFileSync("evaluation/experiments/split-digraphs/exploration/coda-evidence.json", "utf8"));
    expect(englishSplitVowelSupports).toEqual(evidence.rows.map((row: { vowel: unknown; codaSounds: string[]; codaWritten: string; marker: string }) => ({
      vowel: row.vowel, coda: { sounds: row.codaSounds, written: row.codaWritten }, marker: row.marker,
    })));
    for (const support of englishSplitVowelSupports) {
      expect(policy.describe(context({ vowel: { sound: support.vowel.sound, form: support.vowel.component, position: "nucleus" }, coda: support.coda }))).toMatchObject({ status: "eligible", support, probability: 70 });
    }
  });
  it("does not treat onset y or an unsupported vowel as a split vowel", () => {
    expect(policy.describe(context({ vowel: { sound: "j", form: "y", position: "onset" } }))).toEqual({ status: "refused", reason: "not-nucleus" });
    expect(policy.describe(context({ vowel: { sound: "ɛ", form: "e", position: "nucleus" } }))).toEqual({ status: "refused", reason: "unsupported-vowel" });
  });
  it("requires both the coda phone order and written form", () => {
    for (const coda of [{ sounds: ["t", "s"], written: "st" }, { sounds: ["s", "t"], written: "ts" }, { sounds: ["t"], written: "tt" }]) {
      expect(policy.describe(context({ coda }))).toEqual({ status: "refused", reason: "unsupported-coda" });
    }
    expect(policy.describe(context({ coda: { sounds: ["s", "t"], written: "st" } }))).toMatchObject({ status: "eligible" });
  });
  it("separates route eligibility and monosyllabic probability", () => {
    expect(policy.describe(context({ finalRootSyllable: false }))).toEqual({ status: "refused", reason: "outside-word-edge" });
    expect(policy.describe(context({ syllableCount: 2 }))).toMatchObject({ probability: 35 });
    expect(policy.describe(context({ route: "syllable" }))).toEqual({ status: "refused", reason: "unsupported-input" });
    expect(policy.describe(context({ route: "syllable", finalRootSyllable: false, vowel: { sound: "i:", form: "ie", position: "nucleus" }, coda: { sounds: ["m"], written: "m" } }))).toMatchObject({ status: "eligible", probability: 95, support: { vowel: { component: "e" } } });
  });
  it("uses strict probability boundaries with exactly one draw", () => {
    for (const [roll, status] of [[0.699999, "formed"], [0.7, "not-formed"]] as const) {
      const rand = vi.fn(() => roll);
      expect(policy.sample(context(), rand)).toMatchObject({ status, roll });
      expect(rand).toHaveBeenCalledTimes(1);
    }
  });
  it("skips draws for refused, zero and certain trials", () => {
    const rand = vi.fn(() => { throw new Error("unexpected draw"); });
    policy.sample(context({ finalRootSyllable: false }), rand);
    for (const probability of [0, 100]) {
      const p = createSplitVowelPolicy(englishSplitVowelSupports, { ...routes, word: { ...routes.word, probability } });
      expect(p.sample(context(), rand).status).toBe(probability === 0 ? "not-formed" : "formed");
    }
    expect(rand).not.toHaveBeenCalled();
  });
  it.each([-1, 1, NaN, Infinity])("rejects invalid sampled uniform %s", roll => {
    expect(() => policy.sample(context(), () => roll)).toThrow("random draw");
  });
  it("detaches input configuration and returned evidence", () => {
    const table = structuredClone(englishSplitVowelSupports);
    const config = structuredClone(routes);
    const p = createSplitVowelPolicy(table, config);
    table.length = 0; config.word.swaps.length = 0;
    const result = p.describe(context());
    if (result.status !== "eligible") throw new Error("missing fixture support");
    result.support.coda.sounds.length = 0;
    expect(p.describe(context())).toMatchObject({ status: "eligible", support: { coda: { sounds: ["t"] } } });
  });
  it("rejects duplicate support and invalid configuration probabilities", () => {
    expect(() => createSplitVowelPolicy([...englishSplitVowelSupports, englishSplitVowelSupports[0]], routes)).toThrow("Duplicate");
    expect(() => createSplitVowelPolicy([], { ...routes, syllable: { ...routes.syllable, probability: NaN } })).toThrow("probability");
  });
});
