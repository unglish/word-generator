import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { englishConfig } from "../config/english.js";
import type { SharedSpellingRule } from "../config/language.js";
import { englishSharedSpellings } from "../elements/graphemes/shared.js";
import { createSharedSpellingPolicy } from "./spelling-construction-policy.js";
import type { SharedSpellingContext } from "./spelling-construction-policy.js";

const phone = (sound: string) => {
  const found = englishConfig.phonemes.find(phoneme => phoneme.sound === sound);
  if (!found) throw new Error(`Missing fixture sound ${sound}`);
  return found;
};
function context(sounds: string[], extra: Partial<SharedSpellingContext> = {}): SharedSpellingContext {
  return { phase: "word", offsetInScope: 2, phonemes: sounds.map(phone),
    followingPhoneme: phone("æ"), followingLetter: "a", ...extra };
}
const neverDraw = () => { throw new Error("Unexpected random draw"); };

describe("shared spelling policy", () => {
  it("implements the exact preregistered rules", () => {
    const registered = JSON.parse(readFileSync("evaluation/experiments/aligned-shared-graphemes/protocol.json", "utf8"));
    expect(englishSharedSpellings).toEqual(registered.constructions);
  });
  it.each(englishSharedSpellings)("has positive support for $id", rule => {
    const policy = createSharedSpellingPolicy(englishSharedSpellings);
    const input = context(rule.phonemes.map(phoneme => phoneme.sound));
    expect(policy.describe(rule.id, input)).toEqual({ status: "eligible", ruleId: rule.id,
      form: rule.form, sounds: rule.phonemes.map(phoneme => phoneme.sound), probability: rule.probability });
    expect(policy.sample(rule.id, input, () => 0)).toMatchObject({ status: "formed" });
  });
  it.each([["gz-to-x", ["g", "ʒ"]], ["gz-to-x", ["ŋ", "z"]],
    ["ks-to-x", ["k", "z"]], ["ks-to-x", ["z"]], ["cw-to-qu", ["s", "w"]]] as const)(
    "refuses %s on wrong actual sounds %s without a draw", (id, sounds) => {
      expect(createSharedSpellingPolicy(englishSharedSpellings).sample(id, context([...sounds]), neverDraw))
        .toMatchObject({ status: "refused", reason: "sound-sequence" });
    });
  it("treats initial position relative to the current pass", () => {
    const policy = createSharedSpellingPolicy(englishSharedSpellings);
    expect(policy.sample("ks-to-x", context(["k", "s"], { phase: "syllable", offsetInScope: 0 }), neverDraw))
      .toMatchObject({ reason: "initial-position" });
    expect(policy.describe("ks-to-x", context(["k", "s"], { phase: "word", offsetInScope: 4 })).status).toBe("eligible");
    expect(policy.sample("gz-to-x", context(["g", "z"], { offsetInScope: 0 }), neverDraw))
      .toMatchObject({ reason: "initial-position" });
  });
  it("limits word-only rules to their registered phase", () => {
    const policy = createSharedSpellingPolicy(englishSharedSpellings);
    for (const rule of englishSharedSpellings.filter(rule => rule.scope === "word")) {
      expect(policy.sample(rule.id, context(rule.phonemes.map(phoneme => phoneme.sound), { phase: "syllable" }), neverDraw))
        .toMatchObject({ reason: "wrong-phase" });
    }
  });
  it("checks the following phone separately from the written letter", () => {
    const policy = createSharedSpellingPolicy(englishSharedSpellings);
    for (const followingPhoneme of [undefined, phone("j"), phone("w")]) {
      expect(policy.sample("gz-to-x", context(["g", "z"], { followingPhoneme, followingLetter: "y" }), neverDraw))
        .toMatchObject({ reason: "following-phone" });
    }
    for (const followingLetter of ["", "t", "ae"]) {
      expect(policy.sample("gz-to-x", context(["g", "z"], { followingLetter }), neverDraw))
        .toMatchObject({ reason: "following-letter" });
    }
  });
  it("does not draw for probability 100 or zero", () => {
    expect(createSharedSpellingPolicy(englishSharedSpellings).sample("cw-to-qu", context(["k", "w"]), neverDraw))
      .toMatchObject({ status: "formed" });
    const zero = structuredClone(englishSharedSpellings); zero[0].probability = 0;
    expect(createSharedSpellingPolicy(zero).sample("ks-to-x", context(["k", "s"]), neverDraw))
      .toMatchObject({ status: "refused", reason: "zero-probability" });
  });
  it.each([25, 85])("has the exact %i percent decision boundary and one draw per eligible trial", probability => {
    const rule = { ...englishSharedSpellings[0], probability };
    const policy = createSharedSpellingPolicy([rule]); let successes = 0; let draws = 0;
    for (let i = 0; i < 1000; i++) {
      const trial = policy.sample(rule.id, context(["k", "s"]), () => { draws++; return i / 1000; });
      if (trial.status === "formed") successes++;
    }
    expect(successes).toBe(probability * 10); expect(draws).toBe(1000);
    expect(policy.sample(rule.id, context(["k", "s"]), () => probability / 100).status).toBe("roll-failed");
  });
  it("preserves the two eligible ks trial law when the first attempt fails", () => {
    const policy = createSharedSpellingPolicy(englishSharedSpellings); let successes = 0; let draws = 0;
    for (let first = 0; first < 100; first++) for (let second = 0; second < 100; second++) {
      const a = policy.sample("ks-to-x", context(["k", "s"], { phase: "syllable" }), () => { draws++; return first / 100; });
      if (a.status === "formed") { successes++; continue; }
      const b = policy.sample("ks-to-x", context(["k", "s"]), () => { draws++; return second / 100; });
      if (b.status === "formed") successes++;
    }
    expect(successes).toBe(4375); expect(draws).toBe(17500);
  });
  it("detaches compiled policy and returned support from caller mutation", () => {
    const rules = structuredClone(englishSharedSpellings); const policy = createSharedSpellingPolicy(rules);
    const input = context(["g", "z"]); const before = policy.describe("gz-to-x", input);
    rules[1].phonemes[0].sound = "ŋ"; rules[1].context.following!.letters.length = 0;
    rules[1].context.nonInitial = false; rules[1].probability = 0; rules[1].form = "wrong";
    const exposed = policy.describe("gz-to-x", input);
    if (exposed.status !== "eligible") throw new Error("Expected eligible fixture");
    exposed.sounds[0] = "changed";
    expect(policy.describe("gz-to-x", input)).toEqual(before);
    expect(policy.ruleIds).toEqual(["ks-to-x", "gz-to-x", "cw-to-qu"]);
  });
  it.each([-1, 1, Number.NaN, Number.POSITIVE_INFINITY])("rejects invalid RNG value %s", roll => {
    expect(() => createSharedSpellingPolicy(englishSharedSpellings).sample("ks-to-x", context(["k", "s"]), () => roll))
      .toThrow("Invalid shared spelling RNG value");
  });
  it.each([
    { probability: -1 }, { probability: 101 }, { probability: Number.NaN },
    { form: "" }, { id: "" }, { phonemes: [] }, { phonemes: [{ sound: "k" }] },
    { phonemes: [{ sound: "" }, { sound: "s" }] },
    { context: { following: { phoneClass: "vowel", letters: [] } } },
    { context: { following: { phoneClass: "vowel", letters: ["ab"] } } },
  ] satisfies Partial<SharedSpellingRule>[])("rejects invalid rule shape %j", patch => {
    expect(() => createSharedSpellingPolicy([{ ...englishSharedSpellings[0], ...patch }])).toThrow("Invalid or duplicate");
  });
  it.each(["null", "[]", JSON.stringify("word")])("rejects malformed context decoded as %s", serialized => {
    const rule = { ...englishSharedSpellings[0], context: JSON.parse(serialized) };
    expect(() => createSharedSpellingPolicy([rule])).toThrow("Invalid or duplicate");
  });
  it("does not mutate phonological context during description or sampling", () => {
    const input = context(["g", "z"]); const before = structuredClone(input);
    const policy = createSharedSpellingPolicy(englishSharedSpellings);
    policy.describe("gz-to-x", input); policy.sample("gz-to-x", input, () => 0.5);
    expect(input).toEqual(before);
  });
  it("rejects duplicate and unknown rule IDs", () => {
    expect(() => createSharedSpellingPolicy([englishSharedSpellings[0], englishSharedSpellings[0]])).toThrow("duplicate");
    expect(() => createSharedSpellingPolicy([]).describe("missing", context(["k", "s"]))).toThrow("Unknown");
  });
});
