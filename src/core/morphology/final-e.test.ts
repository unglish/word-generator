import { describe, expect, it } from "vitest";
import { createGenerator, englishConfig, generateWord } from "../../index.js";
import { findExample } from "../../test-support/find-example.js";

function generatorWithSuffix(suffix: string) {
  const morphology = englishConfig.morphology!;
  const suffixed = { bare: 0, prefixed: 0, suffixed: 100, both: 0 };
  return createGenerator({
    ...englishConfig,
    morphology: {
      ...morphology,
      suffixes: morphology.suffixes.filter(affix => affix.written === suffix),
      templateWeights: { lexicon: suffixed, text: suffixed },
    },
  });
}

describe("final e at the root-suffix boundary", () => {
  it.each([
    { seed: 5_000_104, base: "widge", suffix: "es", phones: ["ɪ", "z"], written: "widges" },
    { seed: 5_001_401, base: "froke", suffix: "s", phones: ["s"], written: "frokes" },
    { seed: 5_007_891, base: "spy", suffix: "es", phones: ["z"], written: "spies" },
    { seed: 5_011_428, base: "sale", suffix: "ist", phones: ["ɪ", "s", "t"], written: "salist" },
    { seed: 4_011_935, base: "zite", suffix: "ian", phones: ["i:", "ə", "n"], written: "zitian" },
    { seed: 5_004_681, base: "ree", suffix: "ing", phones: ["ɪ", "ŋ"], written: "reing" },
    { seed: 5_002_295, base: "blue", suffix: "ing", phones: ["ɪ", "ŋ"], written: "bluing" },
    { seed: 5_014_397, base: "free", suffix: "ed", phones: ["d"], written: "freed" },
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

  it.each([
    { suffix: "ism", onsetLength: 1, phones: ["ɪ", "z", "ə", "m"] },
    { suffix: "ist", onsetLength: 0, phones: ["ɪ", "s", "t"] },
  ])("keeps the e in rhotic ure before -$suffix", ({ suffix, onsetLength, phones }) => {
    const generator = generatorWithSuffix(suffix);
    const { word, options } = findExample(candidate => {
      const last = candidate.trace?.graphemeSelections.at(-1);
      return last?.position === "nucleus" && last.phoneme === "ɚ" && last.emitted === "ure"
        && candidate.trace?.baseSpelling?.surface.endsWith("ure") === true
        && candidate.lexical?.root.at(-1)?.onset.length === onsetLength;
    }, {
      property: `a final /ɚ/ spelled ure with an onset of length ${onsetLength}`,
      limit: 3_000,
      generator,
      options: { syllableCount: 2 },
    });
    const base = word.trace!.baseSpelling!.surface;
    expect(word.trace?.morphology?.realization?.suffix?.resolved).toMatchObject({ written: suffix, phonemes: phones });
    expect(word.written.clean).toBe(base + suffix);
    expect(generator.generateWord({ ...options, trace: false }).written).toEqual(word.written);
  });

  it.each([
    { suffix: "ism", position: "coda", ending: /[^aeiou]e$/, phones: ["ɪ", "z", "ə", "m"] },
    { suffix: "ed", position: "nucleus", ending: /ie$/, phones: ["d"] },
    { suffix: "ial", position: "coda", ending: /[^aeiou]e$/, phones: ["i:", "ə", "l"] },
    { suffix: "ed", position: "coda", ending: /[^aeiou]e$/, phones: ["d"] },
    { suffix: "er", position: "nucleus", ending: /ue$/, phones: ["ɚ"] },
  ])("drops the redundant e before -$suffix on a $position-final root", ({ suffix, position, ending, phones }) => {
    const generator = generatorWithSuffix(suffix);
    const { word, options } = findExample(candidate => {
      const orthography = candidate.trace?.orthography;
      const resolved = candidate.trace?.morphology?.realization?.suffix?.resolved;
      return !!orthography && ending.test(orthography.surface)
        && orthography.graphemeUnits.at(-1)?.position === position
        && resolved?.written === suffix && resolved.phonemes.join(" ") === phones.join(" ");
    }, { property: `a ${position}-final root before -${suffix}`, limit: 3_000, generator });
    const base = word.trace!.baseSpelling!.surface;
    expect(word.trace?.morphology?.realization?.suffix?.resolved).toMatchObject({ written: suffix, phonemes: phones });
    expect(word.written.clean).toBe(base.slice(0, -1) + suffix);
    expect(generator.generateWord({ ...options, trace: false }).written).toEqual(word.written);
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
