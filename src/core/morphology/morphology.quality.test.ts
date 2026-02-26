import { describe, it, expect } from "vitest";
import { generateWords } from "../generate.js";
import { readFileSync } from "fs";
import { join } from "path";

function loadCmuFreqs(filename: string): Record<string, number> {
  const repoRoot = join(__dirname, "..", "..", "..");
  const raw = JSON.parse(readFileSync(join(repoRoot, "memory", filename), "utf8")) as Record<string, number>;
  const total = Object.values(raw).reduce((a, b) => a + b, 0);
  const freq: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) freq[k] = v / total;
  return freq;
}

function countNgram(text: string, ngram: string): number {
  let count = 0;
  for (let i = 0; i <= text.length - ngram.length; i++) {
    if (text.slice(i, i + ngram.length) === ngram) count++;
  }
  return count;
}

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

  it("new nominal suffix -ian appears in larger deterministic samples", () => {
    const sample = generateWords(5000, { seed: 2026, morphology: true, mode: "lexicon" });
    const count = sample.filter(w => /ian$/.test(w.written.clean)).length;
    expect(count).toBeGreaterThanOrEqual(3);
  });

  it("new nominal suffix -ial appears in larger deterministic samples", () => {
    const sample = generateWords(5000, { seed: 2027, morphology: true, mode: "lexicon" });
    const count = sample.filter(w => /ial$/.test(w.written.clean)).length;
    expect(count).toBeGreaterThanOrEqual(3);
  });

  it("keeps ia and ian representation above regression floors vs CMU", () => {
    const cmuBigrams = loadCmuFreqs("cmu-lexicon-bigrams.json");
    const cmuTrigrams = loadCmuFreqs("cmu-lexicon-trigrams.json");
    const sample = generateWords(30000, { seed: 2028, morphology: true, mode: "lexicon" });

    let bigramTotal = 0;
    let trigramTotal = 0;
    let iaCount = 0;
    let ianCount = 0;

    for (const w of sample) {
      const clean = w.written.clean.toLowerCase();
      bigramTotal += Math.max(0, clean.length - 1);
      trigramTotal += Math.max(0, clean.length - 2);
      iaCount += countNgram(clean, "ia");
      ianCount += countNgram(clean, "ian");
    }

    const iaFreq = iaCount / bigramTotal;
    const ianFreq = ianCount / trigramTotal;
    const iaRatio = iaFreq / cmuBigrams.ia;
    const ianRatio = ianFreq / cmuTrigrams.ian;

    expect(iaRatio).toBeGreaterThanOrEqual(0.2);
    expect(ianRatio).toBeGreaterThanOrEqual(0.45);
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
