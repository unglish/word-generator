import { describe, expect, it } from "vitest";
import { createGenerator, createSeededRng, englishConfig } from "../index.js";
import {
  expandClusterConstraintBans,
  type LanguageConfig,
} from "../config/language.js";
import type { Word } from "../types.js";
import { findExample } from "../test-support/find-example.js";
import { repairClusters } from "./repair.js";

// Issue #418: /z.ʃ/, /ʃ.h/ and /k.tʃ/ across a syllable join are rare or
// impossible in English. Spelling dedup then erases a letter that belonged to
// a different sound (`s`+`sh`→`sh`, `sh`+`h`→`sh`, `k`+`ch`→`ch`).

const ILLEGAL_JOINS = new Set(["z|ʃ", "ʃ|h", "k|tʃ"]);

type SoundLike = string | { sound: string };
type Shape = {
  onset: readonly SoundLike[];
  nucleus: readonly SoundLike[];
  coda: readonly SoundLike[];
};

function soundOf(value: SoundLike | undefined): string | undefined {
  if (value === undefined) return undefined;
  return typeof value === "string" ? value : value.sound;
}

/** Each banned coda→onset pair present at a syllable boundary. */
function illegalJoins(syllables: readonly Shape[]): string[] {
  const found: string[] = [];
  for (let i = 0; i < syllables.length - 1; i++) {
    const coda = soundOf(syllables[i].coda.at(-1));
    const onset = soundOf(syllables[i + 1].onset[0]);
    if (!coda || !onset) continue;
    const key = `${coda}|${onset}`;
    if (ILLEGAL_JOINS.has(key)) found.push(key);
  }
  return found;
}

/** English without the #418 boundary bans (pre-fix generator behavior). */
function withoutIllegalJoinBans(): LanguageConfig {
  return {
    ...englishConfig,
    clusterConstraint: {
      ...englishConfig.clusterConstraint!,
      rules: englishConfig.clusterConstraint!.rules!.filter(
        (rule) =>
          !(
            rule.mode === "ban" &&
            rule.coda.sounds?.length === 1 &&
            rule.onset.sounds?.length === 1 &&
            ILLEGAL_JOINS.has(`${rule.coda.sounds[0]}|${rule.onset.sounds[0]}`)
          ),
      ),
    },
  };
}

describe("illegal syllable-join clusters (#418)", () => {
  it("expands the three banned pairs into the English cluster set", () => {
    const expanded = new Set(
      expandClusterConstraintBans(englishConfig).map(
        ([coda, onset]) => `${coda}|${onset}`,
      ),
    );
    expect(expanded.has("z|ʃ")).toBe(true);
    expect(expanded.has("ʃ|h")).toBe(true);
    expect(expanded.has("k|tʃ")).toBe(true);
    expect(expandClusterConstraintBans(withoutIllegalJoinBans()).some(
      ([coda, onset]) => ILLEGAL_JOINS.has(`${coda}|${onset}`),
    )).toBe(false);
  });

  it("repairClusters drop-coda clears each banned pair", () => {
    const banned = new Set(ILLEGAL_JOINS);
    const cases: Array<{ coda: string; onset: string }> = [
      { coda: "z", onset: "ʃ" },
      { coda: "ʃ", onset: "h" },
      { coda: "k", onset: "tʃ" },
    ];
    for (const { coda, onset } of cases) {
      const syllables = [
        {
          onset: [{ sound: "b" }],
          nucleus: [{ sound: "æ" }],
          coda: [{ sound: coda }],
        },
        {
          onset: [{ sound: onset }],
          nucleus: [{ sound: "ɪ" }],
          coda: [],
        },
      ] as Word["syllables"];
      repairClusters(syllables, banned, "drop-coda");
      expect(illegalJoins(syllables), `${coda}|${onset}`).toEqual([]);
      expect(syllables[0].coda).toHaveLength(0);
      expect(syllables[1].onset[0].sound).toBe(onset);
    }
  });

  it("finds each illegal join without the ban, and English has none at that seed", () => {
    const unconstrained = createGenerator(withoutIllegalJoinBans());
    const english = createGenerator(englishConfig);
    for (const pair of ["z|ʃ", "ʃ|h", "k|tʃ"] as const) {
      const example = findExample(
        (word) => illegalJoins(word.syllables).includes(pair),
        {
          property: `a syllable join ${pair}`,
          generator: unconstrained,
          options: { morphology: false },
          limit: 20_000,
        },
      );
      // Without the ban the final word still carries the pair (no repair).
      expect(illegalJoins(example.word.syllables)).toContain(pair);

      // Same seed may pick a different surviving attempt once drop-coda
      // changes later rejection; the fixed generator must still end clean.
      const fixed = english.generateWord(example.options);
      expect(
        illegalJoins(fixed.syllables),
        `${example.word.pronunciation} -> ${fixed.pronunciation}`,
      ).toEqual([]);
      expect(illegalJoins(fixed.lexical!.root)).toEqual([]);
    }
  });

  it("repairClusters drops a proposed illegal join in English output", () => {
    const english = createGenerator(englishConfig);
    const example = findExample(
      (word) => {
        const proposed = word.trace!.stages.find(
          (stage) => stage.name === "generateSyllables",
        );
        return proposed !== undefined && illegalJoins(proposed.after).length > 0;
      },
      {
        property: "a generateSyllables proposal of an illegal join",
        generator: english,
        options: { morphology: false },
        limit: 80_000,
      },
    );
    const proposed = illegalJoins(
      example.word.trace!.stages.find(
        (stage) => stage.name === "generateSyllables",
      )!.after,
    );
    expect(proposed.length).toBeGreaterThan(0);
    const afterRepair = example.word.trace!.stages.find(
      (stage) => stage.name === "repairClusters",
    )!;
    expect(illegalJoins(afterRepair.after)).toEqual([]);
    expect(illegalJoins(example.word.syllables)).toEqual([]);
    expect(
      example.word.trace!.repairs.some(
        (repair) => repair.rule === "repairClusters",
      ),
    ).toBe(true);
  });

  it("removes illegal joins from bare final words over a seeded sample", () => {
    const count = 10_000;
    const sample = (config: LanguageConfig): Word[] => {
      const generator = createGenerator(config);
      const rand = createSeededRng(418);
      return Array.from({ length: count }, () =>
        generator.generateWord({ rand, morphology: false }),
      );
    };
    const countHits = (words: Word[]) =>
      words.filter((word) => illegalJoins(word.syllables).length > 0).length;

    const before = countHits(sample(withoutIllegalJoinBans()));
    const after = countHits(sample(englishConfig));

    // On main these are tens per 100k; 10k bare words should still see some.
    expect(before).toBeGreaterThan(0);
    console.log(`  illegal joins: ${before} -> ${after} of ${count}`);
    expect(after).toBe(0);
  });

  it("clears root-internal illegal joins under lexicon morphology", () => {
    // Affix joins such as -tion/-sion after a /z/-final root can still make
    // surface /z.ʃ/; those are morphology allomorphy, not this root ban.
    const count = 20_000;
    const generator = createGenerator(englishConfig);
    const rand = createSeededRng(418);
    let rootHits = 0;
    for (let i = 0; i < count; i++) {
      const word = generator.generateWord({ rand, morphology: true });
      if (illegalJoins(word.lexical!.root).length > 0) rootHits++;
    }
    expect(rootHits).toBe(0);
  });
});
