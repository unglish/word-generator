import { describe, expect, it } from "vitest";
import { generateWord } from "../../index.js";

describe("final e at the root-suffix boundary", () => {
  it.each([
    { seed: 5_000_104, base: "widge", suffix: "es", phones: ["ɪ", "z"], written: "widges" },
    { seed: 5_001_401, base: "froke", suffix: "s", phones: ["s"], written: "frokes" },
    { seed: 5_007_891, base: "spy", suffix: "es", phones: ["z"], written: "spies" },
    { seed: 5_005_190, base: "fake", suffix: "ist", phones: ["ɪ", "s", "t"], written: "fakist" },
    { seed: 5_000_906, base: "trolssitame", suffix: "ism", phones: ["ɪ", "z", "ə", "m"], written: "trolssitamism" },
    { seed: 4_011_935, base: "zite", suffix: "ian", phones: ["i:", "ə", "n"], written: "zitian" },
    { seed: 4_026_129, base: "osorme", suffix: "ial", phones: ["i:", "ə", "l"], written: "osormial" },
    { seed: 5_000_592, base: "hee", suffix: "ing", phones: ["ɪ", "ŋ"], written: "heeing" },
    { seed: 5_014_397, base: "free", suffix: "ed", phones: ["d"], written: "freed" },
    { seed: 5_001_177, base: "cabie", suffix: "ed", phones: ["d"], written: "cabieed" },
  ])("writes $base + $suffix as $written", ({ seed, base, suffix, phones, written }) => {
    const word = generateWord({ seed, trace: true });
    expect(word.trace?.baseSpelling?.surface).toBe(base);
    expect(word.trace?.morphology?.realization?.suffix?.resolved).toMatchObject({
      written: suffix,
      phonemes: phones,
    });
    expect(word.written.clean).toBe(written);
    expect(generateWord({ seed }).written).toEqual(word.written);
  });

  it.each([5_000_000, 5_005_000, 5_010_000, 5_015_000])(
    "removes silent e before vowel suffixes across 5,000 seeds starting at %i",
    { timeout: 120_000 },
    (firstSeed) => {
      const checkedSuffixes = new Set<string>();
      const retained: { seed: number; root: string; suffix: string }[] = [];
      for (let seed = firstSeed; seed < firstSeed + 5_000; seed++) {
        const { trace } = generateWord({ seed, trace: true });
        const orthography = trace?.orthography;
        const parts = trace?.morphology?.realization?.assembledParts;
        const root = parts?.find((part) => part.role === "root")?.text;
        const suffix = parts?.find((part) => part.role === "suffix")?.text;
        if (!orthography?.surface.endsWith("e") || !suffix || !/^[aeiou]/.test(suffix)) continue;
        const lastGrapheme = orthography.graphemeUnits.at(-1);
        if (lastGrapheme?.position !== "coda") continue;
        checkedSuffixes.add(suffix);
        if (root?.endsWith("e")) retained.push({ seed, root, suffix });
      }
      expect(checkedSuffixes.has("es")).toBe(true);
      expect(retained).toEqual([]);
    },
  );
});
