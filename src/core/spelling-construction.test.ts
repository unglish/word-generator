import { describe, expect, it } from "vitest";
import { englishConfig } from "../index.js";
import { englishSharedSpellings } from "../elements/graphemes/shared.js";
import { BaseSpelling } from "./base-spelling.js";
import { createSharedConstructionPlanner } from "./spelling-construction.js";
import type { SharedConstructionAttempt, SharedSpellingSlot } from "./spelling-construction.js";

const word: SharedSpellingSlot = { phase: "word", partId: null };
const syllable: SharedSpellingSlot = { phase: "syllable", partId: 1 };
function fixture(sounds: string[], forms: string[], parts = sounds.map(() => 0)) {
  const base = new BaseSpelling(sounds.map((sound, id) => ({ id, part: "root", syllableIndex: parts[id],
    segment: "onset", segmentIndex: id, soundAtSpelling: sound,
    boundary: { phoneme: structuredClone(englishConfig.phonemes.find(phone => phone.sound === sound)!) } })), true, true, true);
  forms.forEach((form, id) => base.appendChoice(id, form, form, id, 0));
  return base;
}
const ks = () => fixture(["æ", "k", "s"], ["a", "ck", "s"], [0, 1, 1]);
function readingConfig(base: BaseSpelling) {
  const { units, phones } = base.current();
  return { doubling: undefined, graphemes: units.map(unit => ({ phoneme: phones[unit.id].soundAtSpelling,
    form: unit.selected, frequency: 1, origin: 0, startWord: 1, midWord: 1, endWord: 1, reading: { kind: "single-phone" as const } })) };
}
const planner = (base: BaseSpelling) => createSharedConstructionPlanner(englishSharedSpellings, readingConfig(base));
const noDraw = () => { throw new Error("Unexpected RNG draw"); };

function trial(attempt: SharedConstructionAttempt) {
  if (attempt.result.status !== "evaluated") throw new Error("Expected evaluated fixture");
  return attempt.result.trial;
}

describe("event-time shared construction planning", () => {
  it.each([
    { id: "ks-to-x", sounds: ["æ", "k", "s"], forms: ["a", "ck", "s"], ids: [1, 2], form: "x", roll: 0.24 },
    { id: "gz-to-x", sounds: ["ɛ", "g", "z", "æ"], forms: ["e", "g", "z", "a"], ids: [1, 2], form: "x", roll: 0.84 },
    { id: "cw-to-qu", sounds: ["k", "w"], forms: ["c", "w"], ids: [0, 1], form: "qu", roll: undefined },
  ])("plans $id from complete live units and replays without RNG", spec => {
    const base = fixture(spec.sounds, spec.forms); const plan = planner(base); let draws = 0;
    const attempt = plan.decide(base.constructionState(), word, spec.id, spec.ids, () => { draws++; return spec.roll!; });
    expect(trial(attempt)).toMatchObject({ status: "formed", support: { form: spec.form } });
    expect(draws).toBe(spec.roll === undefined ? 0 : 1);
    plan.verify(base.constructionState(), word, spec.id, spec.ids, attempt);
    expect(draws).toBe(spec.roll === undefined ? 0 : 1);
    expect(base.snapshot().surface).toBe(spec.forms.join(""));
  });

  it("derives scope-relative initial position from parts rather than root offset", () => {
    const base = ks(); const plan = planner(base);
    const local = plan.decide(base.constructionState(), syllable, "ks-to-x", [1, 2], noDraw);
    expect(trial(local)).toEqual({ status: "refused", ruleId: "ks-to-x", reason: "initial-position" });
    expect(trial(plan.decide(base.constructionState(), word, "ks-to-x", [1, 2], () => 0))).toMatchObject({ status: "formed" });
  });

  it("allows a failed eligible syllable trial to retry at the word slot", () => {
    const base = fixture(["æ", "k", "s"], ["a", "k", "s"]); const plan = planner(base); let draws = 0;
    const rand = () => ++draws === 1 ? 0.25 : 0.249;
    expect(trial(plan.decide(base.constructionState(), { phase: "syllable", partId: 0 }, "ks-to-x", [1, 2], rand)).status).toBe("roll-failed");
    expect(trial(plan.decide(base.constructionState(), word, "ks-to-x", [1, 2], rand)).status).toBe("formed");
    expect(draws).toBe(2);
  });

  it("refuses cross-part consumption in a syllable slot before drawing", () => {
    const base = fixture(["æ", "k", "s"], ["a", "k", "s"], [0, 0, 1]);
    expect(planner(base).decide(base.constructionState(), syllable, "ks-to-x", [1, 2], noDraw).result)
      .toEqual({ status: "unavailable", reason: "outside-scope" });
  });

  it("refuses unresolved source ancestry before drawing", () => {
    const base = ks(); base.edit(1, 2, "k", "opaque");
    expect(planner(base).decide(base.constructionState(), word, "ks-to-x", [1, 2], noDraw).result)
      .toEqual({ status: "unavailable", reason: "unresolved-ownership" });
  });

  it("does not license gz through an unresolved following vowel letter", () => {
    const base = fixture(["ɛ", "g", "z", "æ"], ["e", "g", "z", "a"]); base.edit(3, 1, "e", "opaque");
    expect(trial(planner(base).decide(base.constructionState(), word, "gz-to-x", [1, 2], noDraw)))
      .toMatchObject({ status: "refused", reason: "following-phone" });
  });

  it.each(["cursor", "phone-order", "input-cells", "part", "text", "roll", "probability", "outcome", "context", "version"])("rejects forged %s evidence", field => {
    const base = ks(); const plan = planner(base);
    const attempt = plan.decide(base.constructionState(), word, "ks-to-x", [1, 2], () => 0.1);
    if (attempt.result.status !== "evaluated") throw new Error("Expected evaluated fixture");
    if (field === "cursor") attempt.cursor.nextEditId++;
    if (field === "phone-order") attempt.result.span.phoneIds.reverse();
    if (field === "input-cells") attempt.result.span.inputCellIds.pop();
    if (field === "part") attempt.result.span.sourcePartIds[0] = 9;
    if (field === "text") attempt.result.span.before = "ks";
    if (field === "context") attempt.result.context.offsetInScope = 7;
    if (field === "version") Object.assign(attempt, { version: 9 });
    const sampled = attempt.result.trial;
    if (sampled.status === "refused") throw new Error("Expected eligible fixture");
    if (field === "roll") delete sampled.roll;
    if (field === "probability") sampled.support.probability = 100;
    if (field === "outcome") sampled.status = "roll-failed";
    expect(() => plan.verify(base.constructionState(), word, "ks-to-x", [1, 2], attempt)).toThrow();
  });

  it("rejects a stale attempt after another edit changes the cursor", () => {
    const base = ks(); const plan = planner(base);
    const attempt = plan.decide(base.constructionState(), word, "ks-to-x", [1, 2], () => 0);
    base.edit(0, 1, "e", "earlier-letter");
    expect(() => plan.verify(base.constructionState(), word, "ks-to-x", [1, 2], attempt)).toThrow(/Invalid shared spelling attempt/);
  });

  it("revalidates live ownership rather than using a previous successful plan", () => {
    const base = ks(); const plan = planner(base);
    const attempt = plan.decide(base.constructionState(), word, "ks-to-x", [1, 2], () => 0);
    base.edit(1, 1, "", "partial-delete");
    expect(() => plan.verify(base.constructionState(), word, "ks-to-x", [1, 2], attempt)).toThrow();
    expect(plan.decide(base.constructionState(), word, "ks-to-x", [1, 2], noDraw).result.status).toBe("unavailable");
  });

  it("replays refusals without requesting a random draw", () => {
    const base = ks(); const plan = planner(base);
    const attempt = plan.decide(base.constructionState(), syllable, "ks-to-x", [1, 2], noDraw);
    plan.verify(base.constructionState(), syllable, "ks-to-x", [1, 2], attempt);
    expect(() => plan.verify(base.constructionState(), word, "ks-to-x", [1, 2], attempt)).toThrow();
  });

  it("records probability-zero refusal and rejects an invented draw at probability 100", () => {
    const base = fixture(["k", "w"], ["c", "w"]);
    const zero = createSharedConstructionPlanner(englishSharedSpellings.map(rule => ({ ...rule, probability: 0 })), readingConfig(base));
    const refusal = zero.decide(base.constructionState(), word, "cw-to-qu", [0, 1], noDraw);
    expect(trial(refusal)).toMatchObject({ status: "refused", reason: "zero-probability" });
    zero.verify(base.constructionState(), word, "cw-to-qu", [0, 1], refusal);
    const plan = planner(base);
    const attempt = plan.decide(base.constructionState(), word, "cw-to-qu", [0, 1], noDraw);
    Object.assign(trial(attempt), { roll: 0.5 });
    expect(() => plan.verify(base.constructionState(), word, "cw-to-qu", [0, 1], attempt)).toThrow();
  });

  it("binds replay to the configured law rather than trusting stored support", () => {
    const base = ks();
    const attempt = planner(base).decide(base.constructionState(), word, "ks-to-x", [1, 2], () => 0.1);
    const changed = createSharedConstructionPlanner(englishSharedSpellings.map(rule => ({ ...rule, probability: 50 })), readingConfig(base));
    expect(() => changed.verify(base.constructionState(), word, "ks-to-x", [1, 2], attempt)).toThrow();
  });

  it("records cross-part gz phones separately from the display anchor", () => {
    const base = fixture(["ɛ", "g", "z", "æ"], ["e", "g", "z", "a"], [0, 0, 1, 1]);
    const plan = planner(base); const attempt = plan.decide(base.constructionState(), word, "gz-to-x", [1, 2], () => 0.1);
    expect(attempt.result).toMatchObject({ status: "evaluated", span: { sourcePartIds: [0, 1], displayPartId: 0 },
      trial: { status: "formed", support: { sounds: ["g", "z"] } } });
    plan.verify(base.constructionState(), word, "gz-to-x", [1, 2], attempt);
  });

  it("detaches attempts from live state and the compiled policy", () => {
    const base = ks(); const plan = planner(base); const before = base.snapshot();
    const first = plan.decide(base.constructionState(), word, "ks-to-x", [1, 2], () => 0);
    if (first.result.status !== "evaluated") throw new Error("Expected evaluated fixture");
    first.result.context.phonemes[0].sound = "g";
    first.result.span.phonemes[0].sound = "z";
    first.cursor.nextEditId = 99;
    expect(base.snapshot()).toEqual(before);
    expect(trial(plan.decide(base.constructionState(), word, "ks-to-x", [1, 2], () => 0))).toMatchObject({ status: "formed" });
  });
});
