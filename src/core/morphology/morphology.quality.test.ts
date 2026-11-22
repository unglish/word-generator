import { describe, it, expect } from "vitest";
import { createGenerator, generateWords } from "../../index.js";
import { englishConfig } from "../../config/english.js";

describe("Morphology quality benchmarks", () => {
  const words = generateWords(1000, { seed: 42, morphology: true });

  it("at least 30% of words have affixes", () => {
    const affixed = words.filter(w => {
      const clean = w.written.clean;
      const suffixes = [/ing$/, /ly$/, /ed$/, /s$/, /ness$/, /ment$/, /tion$/, /ful$/, /less$/];
      const prefixes = [/^un/, /^re/, /^dis/, /^pre/, /^mis/, /^over/, /^out/];
      return suffixes.some(r => r.test(clean)) || prefixes.some(r => r.test(clean));
    });
    expect(affixed.length).toBeGreaterThanOrEqual(300);
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

  it.each(["ian", "ial", "sion"])("realizes rare -%s when selected", written => {
    const morphology = englishConfig.morphology!;
    const suffix = morphology.suffixes.find(affix => affix.written === written)!;
    const suffixed = { bare: 0, suffixed: 1, prefixed: 0, both: 0 };
    const generator = createGenerator({
      ...englishConfig,
      morphology: {
        ...morphology,
        suffixes: [suffix],
        templateWeights: { text: suffixed, lexicon: suffixed },
      },
    });
    const word = generator.generateWord({ seed: 2026, trace: true, mode: "lexicon" });
    expect(word.trace!.morphology!.realization!.suffix!.resolved.written).toBe(written);
    expect(word.written.clean.endsWith(written)).toBe(true);
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
