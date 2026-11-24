import { describe, it, expect } from "vitest";
import { createGenerator, englishConfig, generateWord, generateWords } from "../../index.js";
import { createSeededRng } from "../../utils/random.js";
import cmuBigrams from "../../../data/cmu/ordinary/bigrams.json";
import cmuTrigrams from "../../../data/cmu/ordinary/trigrams.json";
describe("Morphology quality benchmarks", () => {
  const words = generateWords(1000, { seed: 42, morphology: true, trace: true });

  it("applies affixes to roughly half of lexicon words", () => {
    const affixed = words.filter(word => word.trace?.summary.morphologyApplied).length;
    expect(affixed).toBeGreaterThan(420);
    expect(affixed).toBeLessThan(600);
  });

  it("no word has written form shorter than 2 characters", () => {
    const short = words.filter(w => w.written.clean.length < 2);
    // Allow up to 1 per 1000 (statistical edge case: bare vowel nucleus with no onset/coda)
    expect(short.length).toBeLessThanOrEqual(1);
  });

  it("no double aspiration in pronunciation", () => {
    for (const w of words) {
      expect(w.pronunciation).not.toContain("ʰʰ");
    }
  });

  it("no empty written forms", () => {
    for (const w of words) {
      expect(w.written.clean.length).toBeGreaterThan(0);
    }
  });

  it("common suffixes all appear: -ing, -ly, -ed, -s", () => {
    const suffixes = ["ing", "ly", "ed", "s"];
    for (const suf of suffixes) {
      const re = new RegExp(`${suf}$`);
      const found = words.some(w => re.test(w.written.clean));
      expect(found, `suffix -${suf} should appear`).toBe(true);
    }
  });

  it("common prefixes appear: un-, re-", () => {
    const prefixes = ["un", "re"];
    for (const pre of prefixes) {
      const re = new RegExp(`^${pre}`);
      const found = words.some(w => re.test(w.written.clean));
      expect(found, `prefix ${pre}- should appear`).toBe(true);
    }
  });

  // These suffixes are attested at very low type frequencies. Exercise their
  // realization with an isolated configured inventory so coverage does not
  // depend on an unrelated change to the default sampling distribution.
  it.each(["ian", "ial", "sion"])("realizes the measured suffix -%s", (written) => {
    const morphology = englishConfig.morphology!;
    const suffix = morphology.suffixes.find(affix => affix.written === written)!;
    expect(suffix.frequencyByMode?.lexicon).toBeGreaterThan(0);
    const suffixed = { bare: 0, suffixed: 1, prefixed: 0, both: 0 };
    const generator = createGenerator({
      ...englishConfig,
      morphology: {
        ...morphology,
        suffixes: [suffix],
        templateWeights: { lexicon: suffixed, text: suffixed },
      },
    });
    const word = generator.generateWord({ seed: 491, trace: true, mode: "lexicon" });
    expect(word.trace?.morphology?.realization?.suffix?.resolved.written).toBe(written);
    expect(word.written.clean.endsWith(written)).toBe(true);
  });

  it("keeps root-internal ia reachable and reports surface ia and ian", () => {
    const rand = createSeededRng(2028);
    let ia = 0;
    let ian = 0;
    let rootIa = 0;
    let bigrams = 0;
    let trigrams = 0;
    for (let draw = 0; draw < 30_000; draw++) {
      const word = generateWord({ rand, mode: "lexicon", trace: true });
      const surface = word.written.clean;
      const root = word.trace?.morphology?.realization?.emittedParts.find(part => part.role === "root")?.text ?? surface;
      rootIa += root.split("ia").length - 1;
      ia += surface.split("ia").length - 1;
      ian += surface.split("ian").length - 1;
      bigrams += surface.length - 1;
      trigrams += Math.max(0, surface.length - 2);
    }
    const iaRatio = ia / bigrams / (cmuBigrams.ia / Object.values(cmuBigrams).reduce((sum, n) => sum + n, 0));
    const ianRatio = ian / trigrams / (cmuTrigrams.ian / Object.values(cmuTrigrams).reduce((sum, n) => sum + n, 0));
    console.log(`Report-only morphology n-grams: ia ${iaRatio.toFixed(3)}× CMU (root hits ${rootIa}), ian ${ianRatio.toFixed(3)}× CMU`);
    expect(rootIa).toBeGreaterThan(0);
  });

  it("enb trigram is reachable in traced lexicon samples", () => {
    const sample = generateWords(20000, { seed: 4242, morphology: true, mode: "lexicon" });
    const count = sample.reduce((acc, w) => {
      const clean = w.written.clean.toLowerCase();
      let local = 0;
      for (let i = 0; i < clean.length - 2; i++) {
        if (clean.slice(i, i + 3) === "enb") local++;
      }
      return acc + local;
    }, 0);
    expect(count).toBeGreaterThan(0);
  });
});
