import { expect, it } from "vitest";
import { createGenerator, generateWord, englishConfig } from "../index.js";
import { resolveAspirationRules } from "../config/language.js";
import { verifyPronunciationPass } from "./pronunciation-evidence.js";
const configuration = { aspiration: resolveAspirationRules(englishConfig.pronunciation?.aspiration),
  vowelReduction: englishConfig.pronunciation?.vowelReduction };
it("replays public root and affixed pronunciation passes", () => {
  let passes = 0;
  let affixed = 0;
  let bare = 0;
  for (let seed = 1; seed <= 200; seed++) {
    const word = generateWord({ seed, trace: true });
    expect(word.trace!.pronunciationPasses).toHaveLength(1);
    if (word.trace!.morphology?.realization) affixed++; else bare++;
    for (const pass of word.trace!.pronunciationPasses!) { verifyPronunciationPass(pass, configuration); passes++; }
  }
  expect(passes).toBe(200);
  expect(affixed).toBeGreaterThan(0);
  expect(bare).toBeGreaterThan(0);
});
it("rejects missing/unused draws, altered output and forged mutation records", () => {
  const aspiration = { enabled: true, targets: [{ segment: "onset" as const }],
    rules: [{ id: "forced-test", when: {}, probability: 100 }], fallbackProbability: 100 };
  const generator = createGenerator({ ...englishConfig, pronunciation: { ...englishConfig.pronunciation, aspiration } });
  const configuration = { aspiration: resolveAspirationRules(aspiration), vowelReduction: englishConfig.pronunciation?.vowelReduction };
  const word = generator.generateWord({ seed: 1, trace: true });
  const pass = word.trace!.pronunciationPasses!.find(item => item.rolls.length && item.changes.length)!;
  expect(pass).toBeDefined();
  const missing = structuredClone(pass); missing.rolls = [];
  expect(() => verifyPronunciationPass(missing, configuration)).toThrow();
  const extra = structuredClone(pass); extra.rolls.push(0.5);
  expect(() => verifyPronunciationPass(extra, configuration)).toThrow("Unused");
  const output = structuredClone(pass); output.pronunciation += "x";
  expect(() => verifyPronunciationPass(output, configuration)).toThrow("replay mismatch");
  const changes = structuredClone(pass); changes.changes = [];
  expect(() => verifyPronunciationPass(changes, configuration)).toThrow("replay mismatch");
});
