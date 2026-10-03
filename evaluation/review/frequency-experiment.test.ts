import { describe, expect, it } from "vitest";
import { fitFrequencyExperiment } from "../corpus/frequency-experiment.js";
import { parseCmuPhone } from "../corpus/cmu.js";

describe("registered frequency experiment orchestration", () => {
  it("preserves every source row, split identity and independently selected arm", () => {
    const spellings = Array.from({ length: 200 }, (_, index) =>
      `word${String.fromCharCode(97 + Math.floor(index / 26))}${String.fromCharCode(97 + index % 26)}`);
    const frequencies = spellings.map((spelling, index) => ({ spelling, label: spelling,
      line: index + 2, count: index + 1, lowercaseCount: index + 1 }));
    const pronunciations = spellings.map((spelling, index) => ({ spelling, label: spelling,
      line: index + 1, tokens: ["W", "ER1", "D"], phones: ["W", "ER1", "D"].map(raw => parseCmuPhone(raw)!) }));
    const pos = frequencies.map(entry => ({ ...entry, rawPosTags: "Noun", rawPosCounts: String(entry.count) }));
    const result = fitFrequencyExperiment(frequencies, pronunciations, pos);
    expect(Object.values(result.split).flat().sort()).toEqual([...spellings].sort());
    expect(result.models.baseline.wordMass).toBe(result.split.training.length);
    expect(result.models.candidate.wordMass).toBe(frequencies.filter(entry =>
      result.split.training.includes(entry.spelling)).reduce((sum, entry) => sum + entry.count, 0));
    expect(result.scores.baseline.words.map(word => word.spelling)).toEqual(result.split.heldOut);
    expect(result.choices.baseline.trials).toHaveLength(8);
    expect(result.choices.candidate.trials).toHaveLength(8);
    expect(result.frequencyStrata.reduce((sum, row) => sum + row.tokens, 0)).toBe(result.scores.baseline.summary.tokens);
    expect(result.pos).toHaveLength(frequencies.length);
    expect(fitFrequencyExperiment(frequencies, pronunciations, pos)).toEqual(result);
  });
});
