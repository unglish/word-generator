import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { proposeLimits, type SeedResult } from "./phoneme-calibration.js";

const calibration = JSON.parse(readFileSync(
  new URL("../../evaluation/diagnostics/phoneme-threshold-calibration/calibration.json", import.meta.url), "utf8",
)) as { results: SeedResult[]; proposals: unknown[] };

describe("phoneme calibration coverage policy", () => {
  it("preserves the recorded proposals, including both fixed zero limits", () => {
    expect(proposeLimits(calibration.results, 3)).toEqual(calibration.proposals);
  });

  it("rejects a consistently missing CMU phoneme instead of allowing it", () => {
    const results = calibration.results.slice(0, 2).map(result => ({ ...result, cmuOnlyKeyCount: 1 }));
    expect(() => proposeLimits(results, 3)).toThrow(
      `seed ${results[0].seed}: 1 missing CMU phonemes (required: 0)`,
    );
  });

  it("rejects constant non-CMU mass instead of allowing it", () => {
    const results = calibration.results.slice(0, 2).map(result => ({ ...result, nonCmuMassPct: 0.2 }));
    expect(() => proposeLimits(results, 3)).toThrow(
      `seed ${results[0].seed}: non-CMU generated mass 0.2% (required: 0%)`,
    );
  });

  it("reports every failing seed even if other seeds meet coverage requirements", () => {
    const results = calibration.results.slice(0, 3).map(result => ({ ...result }));
    results[1].cmuOnlyKeyCount = 1;
    results[2].nonCmuMassPct = 0.000001;
    expect(() => proposeLimits(results, 3)).toThrow(
      `seed ${results[1].seed}: 1 missing CMU phonemes (required: 0)\n` +
      `seed ${results[2].seed}: non-CMU generated mass 0.000001% (required: 0%)`,
    );
  });

  it("continues to reject normalization losses before proposing limits", () => {
    const results = calibration.results.slice(0, 2).map(result => ({ ...result, normalizationLosses: 1 }));
    expect(() => proposeLimits(results, 3)).toThrow(`seed ${results[0].seed}: 1 rejected phoneme tokens`);
  });
});
