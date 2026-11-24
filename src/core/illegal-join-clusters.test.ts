import { describe, expect, it } from "vitest";
import { createGenerator, createSeededRng, englishConfig, generateWord } from "../index.js";
import {
  expandClusterConstraintBans,
  type LanguageConfig,
} from "../config/language.js";
import type { Syllable, Word } from "../types.js";
import { ipaToArpabet } from "../phonotactic/ipa-to-arpabet.js";
import { findExample } from "../test-support/find-example.js";
import { withPhonemeWeights } from "../test-support/phoneme-weights.js";
import { repairClusters } from "./repair.js";
import { syllabify, type SoundSyllable } from "../../evaluation/review/wordlikeness/model.js";
import cmuReference from "../../evaluation/review/wordlikeness/artifacts/reference-v1.json";

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

/** Each matching coda→onset pair at a syllable boundary. */
function matchingJoins(
  syllables: readonly Shape[],
  pairs: ReadonlySet<string> = ILLEGAL_JOINS,
): string[] {
  const found: string[] = [];
  for (let i = 0; i < syllables.length - 1; i++) {
    const coda = soundOf(syllables[i].coda.at(-1));
    const onset = soundOf(syllables[i + 1].onset[0]);
    if (!coda || !onset) continue;
    const key = `${coda}|${onset}`;
    if (pairs.has(key)) found.push(key);
  }
  return found;
}

/** Exempt the three #418 pairs even when a broader rule also bans one. */
function withoutIllegalJoinBans(config = englishConfig): LanguageConfig {
  return {
    ...config,
    clusterConstraint: {
      ...config.clusterConstraint!,
      rules: config.clusterConstraint!.rules!.map((rule) => ({
        ...rule,
        except: [...(rule.except ?? []), ["z", "ʃ"], ["ʃ", "h"], ["k", "tʃ"]],
      })),
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
      expect(matchingJoins(syllables), `${coda}|${onset}`).toEqual([]);
      expect(syllables[0].coda).toHaveLength(0);
      expect(syllables[1].onset[0].sound).toBe(onset);
    }
  });

  it("finds each illegal join without the ban, and English has none at that seed", () => {
    // Keep /z.ʃ/ reachable in the control so the ban is independently exercised.
    const inventory = withPhonemeWeights(englishConfig, (phoneme) =>
      phoneme.sound === "z" ? { ...phoneme, medialCodaMultiplier: 1 } : phoneme,
    );
    const unconstrained = createGenerator(withoutIllegalJoinBans(inventory));
    const constrained = createGenerator(inventory);
    for (const pair of ["z|ʃ", "ʃ|h", "k|tʃ"] as const) {
      const example = findExample(
        (word) => matchingJoins(word.syllables).includes(pair),
        {
          property: `a syllable join ${pair}`,
          generator: unconstrained,
          options: { morphology: false },
          limit: 20_000,
        },
      );
      // Without the ban the final word still carries the pair (no repair).
      expect(matchingJoins(example.word.syllables)).toContain(pair);

      // Same seed may pick a different surviving attempt once drop-coda
      // changes later rejection; the fixed generator must still end clean.
      const fixed = constrained.generateWord(example.options);
      expect(
        matchingJoins(fixed.syllables),
        `${example.word.pronunciation} -> ${fixed.pronunciation}`,
      ).toEqual([]);
      expect(matchingJoins(fixed.lexical!.root)).toEqual([]);
    }
  });

  it("repairClusters drops a proposed illegal join in English output", () => {
    const english = createGenerator(englishConfig);
    const example = findExample(
      (word) => {
        const proposed = word.trace!.stages.find(
          (stage) => stage.name === "generateSyllables",
        );
        return proposed !== undefined && matchingJoins(proposed.after).length > 0;
      },
      {
        property: "a generateSyllables proposal of an illegal join",
        generator: english,
        options: { morphology: false, mode: "text" },
        limit: 80_000,
      },
    );
    const proposed = matchingJoins(
      example.word.trace!.stages.find(
        (stage) => stage.name === "generateSyllables",
      )!.after,
    );
    expect(proposed.length).toBeGreaterThan(0);
    const afterRepair = example.word.trace!.stages.find(
      (stage) => stage.name === "repairClusters",
    )!;
    expect(matchingJoins(afterRepair.after)).toEqual([]);
    expect(matchingJoins(example.word.syllables)).toEqual([]);
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
      words.filter((word) => matchingJoins(word.syllables).length > 0).length;

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
      if (matchingJoins(word.lexical!.root).length > 0) rootHits++;
    }
    expect(rootHits).toBe(0);
  });
});

const cmuOnsets = new Set(cmuReference.model.initial_onsets);

function parseReferenceSyllables(syllables: readonly Syllable[]): SoundSyllable[] {
  const tokens = syllables.flatMap(({ onset, nucleus, coda }) => [
    ...onset.map((phoneme) => ipaToArpabet(phoneme.sound)!),
    ...nucleus.map((phoneme) => `${ipaToArpabet(phoneme.sound)}0`),
    ...coda.map((phoneme) => ipaToArpabet(phoneme.sound)!),
  ]);
  return syllabify(tokens, cmuOnsets);
}

function hasCodaBeforeOnset(syllables: readonly SoundSyllable[], sound: string): boolean {
  return syllables.some((syllable, index) =>
    syllable.coda.at(-1) === sound && Boolean(syllables[index + 1]?.onset.length),
  );
}

// Rates per included entry in the audited Phase 2 root population, using the
// wordlikeness model's maximal-onset parser. Root lengths 5 and up are pooled.
const rootSibilantJunctionRates = [
  { S: 0, Z: 0 },
  { S: 73 / 15644, Z: 29 / 15644 },
  { S: 55 / 9152, Z: 14 / 9152 },
  { S: 24 / 4450, Z: 8 / 4450 },
  { S: 6 / 1802, Z: 1 / 1802 },
] as const;

describe("root boundary voicing restrictions (#485, #496)", () => {
  const licensed = new Set(["n|z", "l|v", "g|z", "s|p", "s|t", "s|k"]);
  const banned = new Set([
    "p|z", "t|z", "k|v", "t|v", "p|dʒ", "θ|d", "m|dʒ",
    "z|p", "z|t", "z|k",
    ...expandClusterConstraintBans(englishConfig).map(([coda, onset]) => `${coda}|${onset}`),
  ]);

  it.each(["lexicon", "text"] as const)(
    "clears banned root junctions and retains English exceptions in %s mode",
    (mode) => {
      const count = 20_000;
      const rand = createSeededRng(20261121);
      const reached = new Set<string>();
      const sibilants = ["S", "Z"] as const;
      const actual = { S: 0, Z: 0 };
      const expected = { S: 0, Z: 0 };
      let attempts = 0;

      for (let i = 0; i < count; i++) {
        const word = generateWord({ mode, rand, trace: true });
        const root = word.lexical!.root;
        expect(matchingJoins(root, banned), word.written.clean).toEqual([]);
        for (const pair of matchingJoins(root, licensed)) reached.add(pair);
        if (mode === "lexicon") {
          const parsed = parseReferenceSyllables(root);
          const rates = rootSibilantJunctionRates[Math.min(parsed.length, rootSibilantJunctionRates.length) - 1];
          for (const sound of sibilants) {
            actual[sound] += Number(hasCodaBeforeOnset(parsed, sound));
            expected[sound] += rates[sound];
          }
        }
        attempts += word.trace!.selection!.attemptsExecuted;
      }

      expect(reached).toEqual(licensed);
      expect(attempts / count).toBeLessThan(3);
      if (mode === "lexicon") {
        for (const sound of sibilants) {
          const ratio = actual[sound] / expected[sound];
          expect(ratio, `/${sound.toLowerCase()}/ to root reference ratio`).toBeGreaterThanOrEqual(0.5);
          expect(ratio, `/${sound.toLowerCase()}/ to root reference ratio`).toBeLessThanOrEqual(2);
        }
      }
    },
  );
});
