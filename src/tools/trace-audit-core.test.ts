import { describe, it, expect } from "vitest";
import { evaluateFailOn, parseFailOn, parseMetrics } from "../../scripts/lib/trace-audit-core.mjs";

describe("trace-audit-core", () => {
  describe("parseMetrics", () => {
    it("dedupes metrics while preserving first-seen order", () => {
      const metrics = parseMetrics("hiatus,glide,hiatus,trigrams", ["trigrams", "hiatus", "glide"]);
      expect(metrics).toEqual(["hiatus", "glide", "trigrams"]);
    });

    it("throws on unknown metric", () => {
      expect(() => parseMetrics("unknown", ["hiatus"])).toThrow("Invalid --metrics entry");
    });
  });

  describe("parseFailOn + evaluateFailOn", () => {
    it("parses valid conditions and passes when comparisons hold", () => {
      const conditions = parseFailOn("final.hiatusRate<=0.01,glide.rootVowelToGlideRate>=0.001");
      const report = {
        final: { hiatusRate: 0.0008 },
        glide: { rootVowelToGlideRate: 0.0015 },
      };
      expect(evaluateFailOn(report, conditions)).toEqual([]);
    });

    it("reports comparison failures with actual value", () => {
      const conditions = parseFailOn("final.hiatusRate<0");
      const report = { final: { hiatusRate: 0 } };
      expect(evaluateFailOn(report, conditions)).toEqual(["final.hiatusRate<0 (actual=0)"]);
    });

    it("reports missing path as non-numeric", () => {
      const conditions = parseFailOn("final.hiatusRate<=0.01");
      const report = {};
      expect(evaluateFailOn(report, conditions)).toEqual([
        "final.hiatusRate<=0.01 (path missing or non-numeric)",
      ]);
    });

    it("throws on malformed condition", () => {
      expect(() => parseFailOn("final.hiatusRate=>0.01")).toThrow("Invalid --fail-on entry");
    });
  });
});
