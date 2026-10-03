import { describe, expect, it } from "vitest";
import { createGenerator, createSeededRng, englishConfig } from "../../src/index.js";
import { parseCmuPhone } from "../corpus/cmu.js";
import { fitFrequencyCounts, type FrequencyObservation } from "../corpus/frequency-model.js";
import { createFrequencyTextConfig, frequencyRuntimeTargets } from "../corpus/frequency-runtime.js";

const entry = (spelling: string, raw: string[], count: number): FrequencyObservation => {
  const phones = raw.map(phone => parseCmuPhone(phone)!);
  return { spelling, phones, count, syllableCount: phones.filter(phone => phone.kind === "vowel").length };
};
const training = [entry("a", ["AH0"], 9), entry("cat", ["K", "AE1", "T"], 2),
  entry("hiatus", ["AH1", "AH0", "AH0"], 3), entry("long", [...Array(20).fill("K"), "AH1"], 4)];

describe("explicit token-weighted runtime target support", () => {
  it("reports every unsupported cell and mass before producing compatible conditional tables", () => {
    const model = fitFrequencyCounts(training, "tokens");
    const target = frequencyRuntimeTargets(model, { phonemeCounts: [3, 1], syllableCounts: [1] });
    expect(target.sourceMass).toBe(18);
    expect(target.eligibleMass).toBe(11);
    expect(target.unsupportedMass).toBe(7);
    expect(target.lengthWeights).toEqual([[1, 9], [3, 2]]);
    expect(target.syllableWeights).toEqual({ 1: [[1, 9]], 3: [[1, 2]] });
    expect(target.unsupported).toEqual([
      { phonemeCount: 3, syllableCount: 3, mass: 3, lengthSupported: true, syllablesSupported: false },
      { phonemeCount: 21, syllableCount: 1, mass: 4, lengthSupported: false, syllablesSupported: true },
    ]);
  });
  it("rejects invalid support, type weights and empty eligibility without a fallback", () => {
    const model = fitFrequencyCounts(training, "tokens");
    for (const support of [{ phonemeCounts: [], syllableCounts: [1] }, { phonemeCounts: [1, 1], syllableCounts: [1] },
      { phonemeCounts: [0], syllableCounts: [1] }, { phonemeCounts: [2], syllableCounts: [1] }]) {
      expect(() => frequencyRuntimeTargets(model, support)).toThrow();
    }
    expect(() => frequencyRuntimeTargets(fitFrequencyCounts(training, "types"), { phonemeCounts: [1], syllableCounts: [1] })).toThrow(/token-weighted/);
  });
  it("changes only text target tables and detaches their arrays from model/report inputs", () => {
    const original = structuredClone(englishConfig);
    const { config, targets } = createFrequencyTextConfig(englishConfig, fitFrequencyCounts(training, "tokens"));
    expect(englishConfig).toEqual(original);
    expect(config.phonemeLengthWeights.lexicon).toEqual(original.phonemeLengthWeights.lexicon);
    expect(config.phonemeToSyllableWeights.lexicon).toEqual(original.phonemeToSyllableWeights.lexicon);
    expect(config.phonemeMaps).toBe(englishConfig.phonemeMaps);
    const restored = { ...config, phonemeLengthWeights: original.phonemeLengthWeights, phonemeToSyllableWeights: original.phonemeToSyllableWeights };
    expect(restored).toEqual(original);
    targets.lengthWeights[0][1] = 123;
    expect(config.phonemeLengthWeights.text[0][1]).toBe(9);
    expect(targets.unsupportedMass).toBe(4);
    expect(config.phonemeToSyllableWeights.text[2]).toEqual([[1, 1], [2, 1]]);
    expect(targets.rootPriorRows.find(row => row.phonemeCount === 2)?.source).toContain("not observed token counts");
    expect(() => createGenerator(config)).not.toThrow();
  });
  it("preserves complete lexicon outputs, traces and next RNG state through the public API", () => {
    const { config } = createFrequencyTextConfig(englishConfig, fitFrequencyCounts(training, "tokens"));
    const control = createGenerator(englishConfig);
    const candidate = createGenerator(config);
    const left = createSeededRng(19281);
    const right = createSeededRng(19281);
    for (let index = 0; index < 200; index++) {
      expect(candidate.generateWord({ rand: right, mode: "lexicon", morphology: true, trace: true }))
        .toEqual(control.generateWord({ rand: left, mode: "lexicon", morphology: true, trace: true }));
    }
    expect(left()).toBe(right());
  });
  it("preserves enabled text output and every RNG draw when tracing is toggled", () => {
    const { config } = createFrequencyTextConfig(englishConfig, fitFrequencyCounts(training, "tokens"));
    const generator = createGenerator(config);
    const left = createSeededRng(28913);
    const right = createSeededRng(28913);
    let leftDraws = 0;
    let rightDraws = 0;
    for (let index = 0; index < 200; index++) {
      const traced = generator.generateWord({ rand: () => { leftDraws++; return left(); }, mode: "text", morphology: true, trace: true });
      const plain = generator.generateWord({ rand: () => { rightDraws++; return right(); }, mode: "text", morphology: true });
      expect({ ...traced, trace: undefined }).toEqual(plain);
      expect(leftDraws).toBe(rightDraws);
    }
    expect(left()).toBe(right());
  });
});
