import { describe, expect, it } from "vitest";
import { createGenerator, createSeededRng, englishConfig, generateWord } from "../index.js";
import type { LanguageConfig } from "../config/language.js";
import type { Phoneme, Word } from "../types.js";
import { findExample } from "../test-support/find-example.js";
import { buildBannedNucleusPairs } from "./rime-compatibility.js";

/**
 * Issue #463: English roots ban tense vowels and diphthongs (and near-absent
 * /ʊ/) before /ŋ/. CMU ARPABET bigrams put each of IY/UW/EY/AY/AW/OW/OY/ER/UH
 * before NG at ≤0.4% of NG; lax /æ ɑ ɔ ʌ ɪ ɛ/ + /ŋ/ stay allowed.
 */
const BANNED_BEFORE_NG = new Set(["i:", "u", "eɪ", "aɪ", "aʊ", "əʊ", "ɔɪ", "ɜ", "ʊ"]);
const ALLOWED_BEFORE_NG = new Set(["æ", "ɑ", "ɔ", "ʌ", "ɪ", "ɛ"]);
/** /ŋ/ coda weight on pinned main before this fix's compensation bump. */
const PRE_FIX_NG_CODA_WEIGHT = 44;

type PhoneLike = string | { sound: string };
type Shape = {
  onset: readonly PhoneLike[];
  nucleus: readonly PhoneLike[];
  coda: readonly PhoneLike[];
};

function phoneSound(phone: PhoneLike | undefined): string | undefined {
  return phone === undefined ? undefined : typeof phone === "string" ? phone : phone.sound;
}

function rootShapes(word: Word): Shape[] {
  return word.lexical?.root ?? word.syllables;
}

/** Nucleus sound when a root syllable's coda starts with /ŋ/. */
function tenseNgHits(syllables: readonly Shape[]): string[] {
  const hits: string[] = [];
  for (const syllable of syllables) {
    if (phoneSound(syllable.coda[0]) !== "ŋ") continue;
    const nucleus = phoneSound(syllable.nucleus.at(-1));
    if (nucleus && BANNED_BEFORE_NG.has(nucleus)) hits.push(nucleus);
  }
  return hits;
}

function withNgCodaWeight(config: LanguageConfig, coda: number): LanguageConfig {
  const phonemes = config.phonemes.map(p => (p.sound === "ŋ" ? { ...p, coda } : p));
  const ng = phonemes.find(p => p.sound === "ŋ")!;
  const remap = (map: Map<string, Phoneme[]>) =>
    new Map([...map.entries()].map(([key, list]) => [key, list.map(p => (p.sound === "ŋ" ? ng : p))]));
  return {
    ...config,
    phonemes,
    phonemeMaps: {
      onset: remap(config.phonemeMaps.onset),
      nucleus: remap(config.phonemeMaps.nucleus),
      coda: remap(config.phonemeMaps.coda),
    },
  };
}

/** Pinned-main phonotactics for the issue seeds: no tense+/ŋ/ ban, /ŋ/ coda 44. */
function preFixConfig(): LanguageConfig {
  const withoutBan: LanguageConfig = {
    ...englishConfig,
    codaConstraints: {
      ...englishConfig.codaConstraints,
      bannedNucleusCodaCombinations: englishConfig.codaConstraints!.bannedNucleusCodaCombinations!
        .filter(rule => !(rule.coda.includes("ŋ") && rule.nucleus.some(n => BANNED_BEFORE_NG.has(n)))),
    },
  };
  return withNgCodaWeight(withoutBan, PRE_FIX_NG_CODA_WEIGHT);
}

const ISSUE_SEEDS = [
  { seed: 1010791, written: "fungse", nucleus: "u" },
  { seed: 1004952, written: "tringse", nucleus: "aɪ" },
  { seed: 1000122, written: "realayngs", nucleus: "eɪ" },
  { seed: 1000045, written: "nipniings", nucleus: "i:" },
  { seed: 1000130, written: "unbudonks", nucleus: "əʊ" },
] as const;

describe("tense vowel / diphthong + /ŋ/ (#463)", () => {
  it("indexes the new ban for every listed nucleus before /ŋ/", () => {
    const codaPairs = buildBannedNucleusPairs(englishConfig.codaConstraints!.bannedNucleusCodaCombinations);
    for (const nucleus of BANNED_BEFORE_NG) {
      expect(codaPairs?.get(nucleus)?.has("ŋ"), nucleus).toBe(true);
    }
    for (const nucleus of ALLOWED_BEFORE_NG) {
      expect(codaPairs?.get(nucleus)?.has("ŋ"), nucleus).toBeFalsy();
    }
    // Prior rhotic + /ŋ/ ban is unchanged.
    expect(codaPairs?.get("ɚ")?.has("ŋ")).toBe(true);
    expect(codaPairs?.get("ɝ")?.has("ŋ")).toBe(true);
  });

  it.each(ISSUE_SEEDS)(
    "removes the banned rime at issue seed $seed ($written)",
    ({ seed, written, nucleus }) => {
      const unconstrained = createGenerator(preFixConfig()).generateWord({ seed, trace: true });
      expect(unconstrained.written.clean).toBe(written);
      expect(tenseNgHits(rootShapes(unconstrained))).toContain(nucleus);

      const fixed = generateWord({ seed, trace: true });
      expect(tenseNgHits(rootShapes(fixed))).toEqual([]);
      for (const stage of fixed.trace!.stages) {
        expect(tenseNgHits(stage.after), stage.name).toEqual([]);
      }
    },
  );

  it("keeps stress repair from choosing a banned nucleus before /ŋ/ (seed 1004952)", () => {
    const unconstrained = createGenerator(preFixConfig()).generateWord({ seed: 1004952, trace: true });
    const repair = unconstrained.trace!.repairs.find(event => event.rule === "repairStressedNuclei");
    expect(unconstrained.written.clean).toBe("tringse");
    expect(repair).toMatchObject({ before: "ə", after: "aɪ" });
    expect(tenseNgHits(rootShapes(unconstrained))).toContain("aɪ");

    // Compensating /ŋ/ weight shifts this seed's path; locate a stressed-schwa
    // repair that still retains a /ŋ/ coda and confirm the ban applies there.
    const fixedRepair = findExample(
      word => {
        const event = word.trace!.repairs.find(candidate => candidate.rule === "repairStressedNuclei");
        return !!event && (event.nucleusReplacement?.coda?.[0] === "ŋ");
      },
      {
        property: "a stressed-schwa repair retaining a /ŋ/ coda",
        limit: 5000,
        firstSeed: 1004952,
      },
    );
    const event = fixedRepair.word.trace!.repairs.find(candidate => candidate.rule === "repairStressedNuclei")!;
    expect(event.before).toBe("ə");
    expect(BANNED_BEFORE_NG.has(event.after)).toBe(false);
    expect(event.nucleusReplacement!.positivePairExclusions).toBeGreaterThan(0);
    expect(tenseNgHits(rootShapes(fixedRepair.word))).toEqual([]);
  });

  it("finds a banned /ŋ/ rime without the rule, and English avoids it at that seed", () => {
    const unconstrained = createGenerator(preFixConfig());
    const example = findExample(word => tenseNgHits(rootShapes(word)).length > 0, {
      property: "a tense or diphthong nucleus before /ŋ/ in the root",
      generator: unconstrained,
      limit: 500,
    });
    const fixed = generateWord(example.options);
    expect(tenseNgHits(rootShapes(fixed))).toEqual([]);
  });

  it("removes banned /ŋ/ rimes across a large seeded sample while keeping /ŋ/", () => {
    const count = 5_000;
    const sample = (config: LanguageConfig): Word[] => {
      const generator = createGenerator(config);
      const rand = createSeededRng(463);
      return Array.from({ length: count }, () => generator.generateWord({ rand, trace: true }));
    };
    const summarize = (words: Word[]) => {
      let hits = 0;
      let ngCodas = 0;
      let rootSyllables = 0;
      const replacement = new Map<string, number>();
      for (const word of words) {
        const roots = rootShapes(word);
        rootSyllables += roots.length;
        hits += tenseNgHits(roots).length;
        for (const syllable of roots) {
          if (phoneSound(syllable.coda[0]) !== "ŋ") continue;
          ngCodas++;
          const nucleus = phoneSound(syllable.nucleus.at(-1)) ?? "?";
          replacement.set(nucleus, (replacement.get(nucleus) ?? 0) + 1);
        }
      }
      return { hits, ngCodas, rootSyllables, replacement };
    };

    const before = summarize(sample(preFixConfig()));
    const after = summarize(sample(englishConfig));
    expect(before.hits).toBeGreaterThan(0);
    expect(after.hits).toBe(0);
    // /ŋ/ remains available; banned nuclei no longer appear before it.
    expect(after.ngCodas).toBeGreaterThan(0);
    expect([...after.replacement.keys()].every(n => !BANNED_BEFORE_NG.has(n))).toBe(true);
    expect([...after.replacement.keys()].some(n => ALLOWED_BEFORE_NG.has(n))).toBe(true);
  });

  it("allows ordinary lax nuclei before /ŋ/", () => {
    const word = findExample(
      candidate => rootShapes(candidate).some(
        syllable => phoneSound(syllable.coda[0]) === "ŋ"
          && ALLOWED_BEFORE_NG.has(phoneSound(syllable.nucleus.at(-1)) ?? ""),
      ),
      { property: "a lax nucleus before /ŋ/", limit: 2000 },
    ).word;
    const syllable = rootShapes(word).find(
      candidate => phoneSound(candidate.coda[0]) === "ŋ"
        && ALLOWED_BEFORE_NG.has(phoneSound(candidate.nucleus.at(-1)) ?? ""),
    )!;
    expect(BANNED_BEFORE_NG.has(phoneSound(syllable.nucleus.at(-1)) ?? "")).toBe(false);
  });
});
