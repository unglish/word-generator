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
    { shape: "-Ce + -es /ɪz/ as -Ces", affix: "s", written: "es", phones: ["ɪ", "z"], ending: /[^aeiou]e$/, drop: 1, add: "es", limit: 150 },
    { shape: "-Ce + -s /s/ as -Ces", affix: "s", written: "s", phones: ["s"], ending: /[^aeiou]e$/, drop: 0, add: "s", limit: 100 },
    { shape: "-Cy + -es /z/ as -Cies", affix: "s", written: "es", phones: ["z"], ending: /[^aeiou]y$/, drop: 1, add: "ies", limit: 120 },
    { shape: "-Ce + -ist as -Cist", affix: "ist", written: "ist", phones: ["ɪ", "s", "t"], ending: /[^aeiou]e$/, drop: 1, add: "ist", limit: 50 },
    { shape: "-Ce + -ian as -Cian", affix: "ian", written: "ian", phones: ["i:", "ə", "n"], ending: /[^aeiou]e$/, drop: 1, add: "ian", limit: 50 },
    { shape: "-ee + -ing as -eing", affix: "ing", written: "ing", phones: ["ɪ", "ŋ"], ending: /ee$/, drop: 1, add: "ing", limit: 1_000 },
    { shape: "-ue + -ing as -uing", affix: "ing", written: "ing", phones: ["ɪ", "ŋ"], ending: /ue$/, drop: 1, add: "ing", limit: 700 },
    { shape: "-ee + -ed as -eed", affix: "ed", written: "ed", phones: ["d"], ending: /ee$/, drop: 1, add: "ed", limit: 1_000 },
  ])("writes $shape", ({ affix, written, phones, ending, drop, add, limit }) => {
    const generator = generatorWithSuffix(affix);
    const { word, options } = findExample(candidate => {
      const resolved = candidate.trace?.morphology?.realization?.suffix?.resolved;
      return ending.test(candidate.trace?.baseSpelling?.surface ?? "")
        && resolved?.written === written && resolved.phonemes.join(" ") === phones.join(" ");
    }, { property: `a root matching ${ending} before -${written} /${phones.join(" ")}/`, limit, generator });
    const base = word.trace!.baseSpelling!.surface;
    expect(word.written.clean).toBe(base.slice(0, base.length - drop) + add);
    expect(generator.generateWord({ ...options, trace: false }).written).toEqual(word.written);
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
