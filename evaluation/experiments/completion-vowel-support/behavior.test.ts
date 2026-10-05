import { describe, expect, it } from "vitest";
import { englishConfig } from "../../../src/config/english.js";
import { BaseSpelling } from "../../../src/core/base-spelling.js";
import { createCompletionPlanner } from "../../../src/core/spelling-completion-planner.js";
import { prepareCompletionTransaction } from "../../../src/core/spelling-completion-transaction.js";

function fixture() {
  const config = structuredClone(englishConfig);
  config.splitVowels = { supports: [], routes: { syllable: { forms: [], probability: 0 },
    word: { swaps: [], probability: 0, monosyllableMultiplier: 1 } },
  completionWeights: [{ phoneme: "eɪ", form: "ai", startWord: 2 }] };
  const sounds = ["eɪ", "s", "ɛ", "t"];
  const forms = ["a", "s", "e", "t"];
  const base = new BaseSpelling(sounds.map((sound, id) => ({ id, part: "root", syllableIndex: id < 2 ? 0 : 1,
    segment: id % 2 === 0 ? "nucleus" : "coda", segmentIndex: 0, soundAtSpelling: sound,
    boundary: { phoneme: structuredClone(config.phonemes.find(phone => phone.sound === sound)!) } })), true, true, true);
  forms.forEach((form, id) => base.appendChoice(id, form, form,
    config.graphemes.findIndex(grapheme => grapheme.phoneme === sounds[id] && grapheme.form === form), 0));
  return { config, base };
}

describe("registered completion support transaction", () => {
  it("resolves the baseline support-only refusal with a whole-unit same-phone certificate", () => {
    const { config, base } = fixture(); const view = base.constructionState(); const before = structuredClone(view);
    const original = createCompletionPlanner({ ...config, splitVowels: { ...config.splitVowels!, completionWeights: undefined } }, []);
    expect(original.decide(view, 0, [], () => 0)).toMatchObject({ status: "evaluated", sample: { status: "infeasible" } });
    const planner = createCompletionPlanner(config, []);
    const attempt = planner.decide(view, 0, [], () => { throw new Error("Single supported candidate needs no draw"); });
    const plan = prepareCompletionTransaction(view, planner, [], attempt, 0, 4);
    expect(plan.certificate).toMatchObject({ before: "a", after: "ai", phoneIds: [0], inputCellIds: [0], outputCellIds: [4, 5] });
    expect(plan.cells.map(cell => cell.text).join("")).toBe("aiset");
    expect(view).toEqual(before);
    const forged = structuredClone(attempt);
    if (forged.status !== "evaluated") throw new Error("Expected evaluated attempt");
    forged.proposals.find(proposal => proposal.form === "ai")!.weight += 1;
    expect(() => prepareCompletionTransaction(view, planner, [], forged, 0, 4)).toThrow("Invalid completion attempt");
    expect(view).toEqual(before);
  });
});
